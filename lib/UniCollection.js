import UniDoc from './docPrototypes/UniDoc';
import schemaExtension from './UniCollectionSS';
import methodsExtension from './UniMethods';
import aggregateExtension from './UniAggregate';
import hooksExtension from './UniHooks';

const noop = () => {};
let mongoIndexesExtension = noop;
let publishExtension = noop;

if (Meteor.isServer) {
    mongoIndexesExtension = require('./UniMongoIndexes').default;
    publishExtension = require('./UniPublish').default;
}

export const _uniExtensions = {
    schemaExtension, mongoIndexesExtension, methodsExtension, aggregateExtension, hooksExtension, publishExtension
};

const _uniCollections = {};

export const UniCollection = createUniCollection();

export function createUniCollection ({CollectionClass = Mongo.Collection, _extensions = Object.values(_uniExtensions)} = {}) {
    class UniCollection extends  CollectionClass {
        constructor (name, options = {}, ...args) {
            if (!name) {
                console.error('This collection can work improper: Universe collection (as opposed to Meteor Collection)' +
                    ' always must have name. If you want create a local collection please pass in options' +
                    ' property: connection: null');
            }
            super(name, options, ...args);
            this._init(name, options);
        }

        static call (obj, ...args) {
            return super.call(obj, ...args);
        }

        static apply (obj, args) {
            return super.apply(obj, args);
        }

        _init (name, options = {}) {
            this._name = name;
            this._docLocalHelpers = {};
            this._universeValidators = {};
            if (options.connection === null) {
                this._isNotConnected = true;
            }
            let docCls;
            if (typeof options.documentClass === 'function') {
                docCls = options.documentClass;
            } else {
                docCls = UniDoc;
            }
            this.setDocumentClass(docCls);
            options.mixins && this._mix(options.mixins, options);
            options.documentClass = options.documentClass || options.docConstructor;

            if (!options.noRegisterEJSONType) {
                this._registerDocConstructorAsANewEJSONType();
            }
            UniCollection._uniCollections[name] = this;
            this._transform = this.create.bind(this);
        }

        /**
         * Sets transformation function for collection.
         * Function passed as an argument will be executed for each document
         * to transform selected documents before the method (like: find, findOne) returns them.
         * UniDoc is a default of document constructor.
         * A good way is inheritance of UniDoc, instead create new constructor
         * @param docClass transformation Object
         * @param direct {Boolean=} tells if UniDoc should be directly linking or by extend method if exists on class.
         * @see UniDoc
         */
        setDocumentClass (docClass, direct = false) {
            if (!direct) {
                docClass = docClass.extend();
            }
            docClass.prototype.getCollection = () => this;
            this._documentClass = docClass;
            Object.keys(this._docLocalHelpers).forEach(methodName => {
                this._documentClass[methodName] = this._docLocalHelpers[methodName];
            });
        }

        _mix (mixins, options) {
            if (!Array.isArray(mixins)) {
                throw new Error('Parameters mixins should be an array!');
            }
            this._mixinInstances = {};
            mixins.forEach((Mixin) => {
                if (typeof Mixin === 'function' && Mixin.prototype instanceof UniCollection.AbstractMixin) {
                    Mixin = new Mixin();
                }
                if (typeof Mixin === 'object' && Mixin instanceof UniCollection.AbstractMixin) {
                    Mixin.mount(this, options);
                    return this._mixinInstances[Mixin.name] = Mixin;
                }
                throw new TypeError('Mixin should be instance of UniCollection.AbstractMixin');
            });
        }

        /**
         * Using this method you can add new helpers function into document prototype.
         * It's alternative way to setConstructor.
         * All of this methods will be added to returned document by function find, findOne
         * @param helpers
         */
        docHelpers (helpers) {
            if (!this._docLocalHelpers) {
                this._docLocalHelpers = {};
            }
            Object.keys(helpers).forEach((key) => {
                this._docLocalHelpers[key] = helpers[key];
                this._documentClass.prototype[key] = helpers[key];
            });
        }


        /**
         * Checks if document belongs to this collection
         * @param doc object or id (on client side you must have this doc in minimongo![subscription needed])
         * @returns boolean
         */
        hasDocument (doc) {
            if (typeof doc === 'string') {
                doc = this.findOne(doc);
            }
            return UniCollection.isDocumentFromCollection(doc, this.getCollectionName());
        }

        /**
         * Adds default sort options to find,
         * but default sort option are used only when someone call find without sort options
         * @param sort
         */
        setDefaultSort (sort) {
            if (!this._orgFind) {
                this._orgFind = this.find;
            }
            this.find = (selector, options) => {
                if (!options || !options.sort) {
                    if (!options) {
                        options = {};
                    }
                    options.sort = sort;
                }
                return this._orgFind(selector || {}, options);
            };
        }

        /**
         * Registers doc constructor as a new EJSON type
         * @private
         */
        _registerDocConstructorAsANewEJSONType () {
            EJSON.addType(this.getCollectionName() + 'Doc', value => {
                return this.create(EJSON.fromJSONValue(value));
            });
        }


        /**
         * This method gives warranty that returned object is document of current collection
         * but if this method cannot return a proper document it will throw error
         * You can provide additional Match.* patterns as a supplement of this.matchingDocument()
         * @param docOrId {UniCollection.UniDoc|String|*} document or id of available document that satisfies pattern
         * @param additionalPattern {Object=} Additional regiments that mast be checked.
         * If true is passed under this argument, then this method will fetch fresh data even if document is correct.
         * @param errorMessage {String=undefined} Custom message of error
         * @returns {UniCollection.UniDoc|*} Returns document if everything is fine
         */
        ensureUniDoc (docOrId, additionalPattern, errorMessage) {
            // Following `check` is because argument audits works only with `check` method
            // and we use Match.test to have possibilities of throwing own errors
            check(docOrId, Match.Any);
            var pattern;
            if (!additionalPattern || additionalPattern === true) {
                pattern = this.matchingDocument();
            } else {
                pattern = this.matchingDocument(additionalPattern);
            }
            if (Match.test(docOrId, String)) {
                docOrId = this.findOne({_id: docOrId});
            } else if ((additionalPattern === true || !Match.test(docOrId, pattern)) &&
                docOrId && Match.test(docOrId._id, String)) {
                //if user object isn't universe document
                docOrId = this.findOne({_id: docOrId._id});
            }
            if (typeof errorMessage === 'string') {
                if (Match.test(docOrId, pattern)) {
                    return docOrId;
                }
                throw new Meteor.Error('notUniDoc', errorMessage);
            }
            check(docOrId, pattern);
            return docOrId;
        }

        /**
         * Pattern argument to checking functions like: this.ensureUniDoc, check and Match.test
         * Basic pattern checks document type if is equal to current constructor of documents in this collection.
         * @param keysPatterns {Object=} If passed, it matches the given keys on document.
         * @returns {Match.Where}
         */
        matchingDocument (keysPatterns) {
            keysPatterns = keysPatterns || {};
            var self = this;
            return Match.Where(function (doc) {
                check(doc, self._documentClass);
                return Object.entries(keysPatterns).every(([key, pattern]) => {
                    return Match.test(doc[key], pattern);
                });
            });
        }

        getCollectionName () {
            return this._name;
        }

        /**
         * Creates new instance of document for current collection
         * @param {Object=} rawDoc object with fieldName value pairs or undefined
         * @param {Object|Boolean=} options if is true or properly save is set as true
         * then document will be saved after creation. The other options are passed to doc.save method.
         * @param {Boolean} options.save Document should be saved after creation.
         * @param {[String]=} options.fieldsList array with names of fields to save
         * @param {[String]=} options.callback Callback after saved. function(error, result)
         * @param {String=} options.useSchema name of schema used to save
         * @returns {UniCollection.UniDoc} New instance of document of current collection
         */
        create (rawDoc = {}, options = false) {
            var doc = new this._documentClass(rawDoc);
            if (options && (typeof options === 'boolean' || options.save)) {
                delete options.save;
                doc.save(options);
            }
            return doc;
        }

        /**
         * Allow users to add new type for method allow/deny to this collection.
         * @param {string} name of type for methods allow, deny like 'insert', 'update'....
         */
        addNewAllowDenyValidatorType (name) {
            this._universeAllowDenyTypes = this._universeAllowDenyTypes || [];
            if (!name) {
                throw new Error('Missing name of validator');
            }
            if (!this._universeAllowDenyTypes.includes(name)) {
                this._universeAllowDenyTypes.push(name);
            }
        }

        allow (options) {
            if (!super.allow) {
                throw new Error('Function allow() is missing. Did you have installed package allow-deny?');
            }
            super.allow.call(this, this._takeUniverseValidators('allow', options));
        }

        deny (options) {
            if (!super.deny) {
                throw new Error('Function deny() is missing. Did you have installed package allow-deny?');
            }
            super.deny.call(this, this._takeUniverseValidators('deny', options));
        }

        update (selector, modifier, ...args) {
            if (args && args.length) {
                //Fix issue: Fibers are lost during document update #8
                if (args[args.length - 1] === null) {
                    delete args[args.length - 1];
                }
                if (args.length) {
                    if (typeof args[1] === 'object') {
                        let result = undefined;
                        optionsContext.withValue(args[1], () => {
                            result = super.update(selector, modifier, ...args);
                        });
                        return result;
                    }
                    return super.update(selector, modifier, ...args);
                }
            }

            return super.update(selector, modifier);
        }
        insert (doc, ...args) {
            if (typeof args[0] === 'object') {
                const options = args.shift();
                let result = undefined;
                optionsContext.withValue(options, () => {
                    result = super.insert(doc, ...args);
                });
                return result;
            }
            return super.insert(doc, ...args);
        }

        remove (selector, ...args) {
            if (typeof args[0] === 'object') {
                const options = args.shift();
                let result = undefined;
                optionsContext.withValue(options, () => {
                    result = super.remove(selector, ...args);
                });
                return result;
            }
            return super.remove(selector, ...args);
        }
        /**
         * This methods checks if for selected arguments the rule pass true
         * @params {String} type of allow/deny validator, rest of arguments is for validator function
         * @returns {boolean}
         */
        validateUniverseRule (type, ...args) {
            var allowFns = UniUtils.get(this, '_universeValidators.' + type + '.allow');
            var denyFns = UniUtils.get(this, '_universeValidators.' + type + '.deny');
            if ((!allowFns || !allowFns.length) && (!denyFns || !denyFns.length)) {
                throw new Meteor.Error(
                    403, 'Access denied. No allow validators set on restricted ' +
                    'collection: \'' + this.getCollectionName() + '\', validator: \'' + type + '\'');
            }
            var self = this;
            if ((denyFns && denyFns.length && _.some(denyFns, function (fn) {
                return fn.apply(self, args);
            })) || !_.some(allowFns, function (fn) {
                return fn.apply(self, args);
            })) {
                throw new Meteor.Error('403', 'Access denied.');
            }
            return true;
        }

        _takeUniverseValidators (allowOrDeny, options) {
            var adTypes = _.union(this._universeAllowDenyTypes || []);
            if (!options) {
                //init only
                return;
            }
            Object.keys(options).forEach(key => {
                let fn = options[key];
                if (adTypes.includes(key)) {
                    if (typeof fn !== 'function') {
                        throw new Error(allowOrDeny + ': Value for `' + key + '` must be a function');
                    }
                    let arr = UniUtils.get(this._universeValidators, key + '.' + allowOrDeny, []);
                    arr.push(fn);
                    UniUtils.set(this._universeValidators, key + '.' + allowOrDeny, arr);
                }
            });
            return _.omit(options, adTypes);
        }

        static isDocumentFromCollection (doc, collectionName) {
            if (typeof doc === 'object' && doc.getCollection) {
                return doc.getCollectionName() === collectionName;
            }
        }

        _validatedInsert (userId, doc, ...args) {
            let options = undefined;
            //Because of additional argument "options", we must pick it out.
            args = args.filter(i =>  {
                if (i && typeof i === 'object' && i._isForUniverse) {
                    delete i._isForUniverse;
                    options = i;
                    return false;
                }
                return true;
            });
            if (!super._validatedInsert) {
                throw new Error('Validation handler is missing. Did you have installed package allow-deny?');
            }
            let result = undefined;
            optionsContext.withValue(options, () => {
                result = super._validatedInsert(userId, doc, ...args);
            });
            return result;
        }

        _validatedUpdate (userId, selector, mutator, options) {
            if (!super._validatedUpdate) {
                throw new Error('Validation handler is missing. Did you have installed package allow-deny?');
            }
            let result = undefined;
            optionsContext.withValue(options, () => {
                result = super._validatedUpdate(userId, selector, mutator, options);
            });
            return result;
        }

        _validatedRemove (userId, selector, ...args) {
            let options = undefined;
            if (!super._validatedRemove) {
                throw new Error('Validation handler is missing. Did you have installed package allow-deny?');
            }
            //Because of additional argument "options", we must pick it out.
            args = args.filter(i =>  {
                if (i && typeof i === 'object' && i._isForUniverse) {
                    delete i._isForUniverse;
                    options = i;
                    return false;
                }
                return true;
            });
            let result = undefined;
            optionsContext.withValue(options, () => {
                result = super._validatedRemove(userId, selector, ...args);
            });
            return result;
        }

        _getContextOptions () {
            return optionsContext.get();
        }
        subscribe (...args) {
            if (this._connection) {
                return this._connection.subscribe(...args);
            }
            return Meteor.subscribe(...args);
        }
    }

    UniCollection._uniCollections = _uniCollections;

    var optionsContext = new Meteor.EnvironmentVariable();

    if (UniCollection.prototype._callMutatorMethod) {
        const _callMutatorMethod = UniCollection.prototype._callMutatorMethod;
        UniCollection.prototype._callMutatorMethod = function (...args) {
            const options = optionsContext.get();
            if (~['insert', 'remove'].indexOf(args[0]) && options && _.size(options) && Array.isArray(args[1])) {
                args[1].push(Object.assign({_isForUniverse: true}, options));
            }
            this._prefix = this._prefix || `/${this.getCollectionName()}/`;
            return _callMutatorMethod.apply(this, args);
        };
    }

    _extensions.forEach(extension => extension(UniCollection));

    return UniCollection;
}

export default UniCollection;
