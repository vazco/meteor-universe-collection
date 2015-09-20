/* global UniCollection: true */
UniCollection = class UniCollection extends Meteor.Collection {
    _docLocalHelpers:Object;
    _documentClass:Object;
    _name:string;

    constructor (name, options = {}, ...args) {
        if (!name) {
            console.error('This collection can work improper: Universe collection (as opposed to Meteor Collection)' +
                ' always must have name. If you want create a local collection please pass in options' +
                ' property: connection: null');
        }
        super(name, options, ...args);
        this._init(name, options);
    }

    _init (name, options = {}) {
        this._name = name;
        this._docLocalHelpers = {};
        let docCls;

        this._initMixins(options);
        options.documentClass = options.documentClass || options.docConstructor;
        if (typeof options.documentClass === "function") {
            docCls = options.documentClass;
        } else {
            docCls = UniCollection.UniDoc;
        }
        this.setDocumentClass(docCls);

        if (name && !options.noRegisterEJSONType) {
            this._registerDocConstructorAsANewEJSONType();
            UniCollection._uniCollections[name] = this;
        }
        this._transform = this.create.bind(this);
        this._init = undefined;
    }

    _getCollection() {
        return this;
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
    setDocumentClass(docClass, direct = false) {
        if (!direct) {
            const oldCls = docClass;
            docClass = class UniDoc extends oldCls {
            };
        }
        docClass.prototype.getCollection = this._getCollection.bind(this);
        this._documentClass = docClass;
        Object.keys(this._docLocalHelpers).forEach(methodName => {
            this._documentClass[methodName] = this._docLocalHelpers[methodName];
        });
    }

    _initMixins(options) {
        var self = this, mixinInstance, eventsLists = ['transformDocument', 'setDocumentPrototype'];
        this._mixinEvents = {};
        if (!this._mixinInstances && _.isArray(options.mixins)) {
            this._mixinInstances = _.chain(options.mixins).map(function (mixin) {
                try {
                    mixinInstance = new mixin(self, options);
                    var fullEventName;
                    _.each(eventsLists, function (eventName) {
                        fullEventName = 'on' + UniUtils.capitalizeFirst(eventName);
                        self._mixinEvents[eventName] = self._mixinEvents[eventName] || [];
                        if (_.isFunction(mixinInstance[fullEventName])) {
                            self._mixinEvents[eventName].push(mixinInstance[fullEventName].bind(mixinInstance));
                        }
                    });
                } catch (e) {
                    console.error('Cannot create instance of mixin because: ' + e.message);
                    mixinInstance = null;
                }
                return mixinInstance;
            }).compact().value();
        }
        this._mixinInstances = this._mixinInstances || [];
    }

    _uniTrigger(eventName, args) {
        var self = this;
        if (Array.isArray(this._mixinEvents[eventName])) {
            this._mixinEvents[eventName].forEach(function (fn) {
                fn(args, self);
            });
        }
    }

    /**
     * Using this method you can add new helpers function into document prototype.
     * It's alternative way to setConstructor.
     * All of this methods will be added to returned document by function find, findOne
     * @param helpers
     */
    docHelpers(helpers:Object) {
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
    hasDocument(doc) {
        if (typeof doc === "string") {
            doc = this.findOne(doc);
        }
        return UniCollection.isDocumentFromCollection(doc, this.getCollectionName());
    }

    /**
     * Adds default sort options to find,
     * but default sort option are used only when someone call find without sort options
     * @param sort
     */
    setDefaultSort(sort) {
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
    _registerDocConstructorAsANewEJSONType() {
        EJSON.addType(this.getCollectionName() + 'Doc', value => {
            return this.create(EJSON.fromJSONValue(value));
        });
    }


    /**
     * Ensures if provided document is matching pattern.
     * You can provide Match.* patterns and prepared this.matchingDocument()
     * @param docOrId {UniCollection.UniDoc|String|*} document or id of available document that satisfies pattern
     * @param pattern {*=} If not set then this.matchingDocument() will be used.
     * But if something was set, even it was value null or undefined, this passed value will be used.
     * @param errorMessage {String=undefined} Custom message of error
     * @returns {UniCollection.UniDoc|*} Returns document if everything is fine
     */
    ensureUniDoc(docOrId, pattern, errorMessage) {
        if (arguments.length < 2) {
            pattern = this.matchingDocument();
        }
        if (typeof docOrId === "string") {
            docOrId = this.findOne({_id: docOrId});
        } else if (typeof docOrId === "object" && !Match.test(docOrId, pattern)) {
            //if user object isn't universe document
            docOrId = this.findOne({_id: docOrId._id});
        }
        if (typeof errorMessage === "string") {
            if (Match.test(docOrId, pattern)) {
                return docOrId;
            }
            throw new Meteor.Error(400, errorMessage);
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
    matchingDocument(keysPatterns:Object = {}) {
        var self = this;
        return Match.Where(function (doc) {
            check(doc, self._documentClass);
            return _.every(keysPatterns, function (pattern, key) {
                return Match.test(doc[key], pattern);
            });
        });
    }

    getCollectionName() {
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
    create(rawDoc:Object = {}, options = false) {
        var doc = new this._documentClass(rawDoc);
        if (options && (typeof options === "boolean" || options.save)) {
            delete options.save;
            doc.save(options);
        }
        return doc;
    }

    /**
     * Allow users to add new type for method allow/deny to this collection.
     * @param {string} name of type for methods allow, deny like 'insert', 'update'....
     */
    addNewAllowDenyValidatorType(name) {
        this._universeAllowDenyTypes = this._universeAllowDenyTypes || [];
        if (!name) {
            throw new Error('Missing name of validator');
        }
        if (!_.contains(this._universeAllowDenyTypes, name)) {
            this._universeAllowDenyTypes.push(name);
        }
    }

    allow(options) {
        super.allow.call(this, this._takeUniverseValidators('allow', options));
    }

    deny(options) {
        super.deny.call(this, this._takeUniverseValidators('deny', options));
    }

    /**
     * This methods checks if for selected arguments the rule pass true
     * @params {String} type of allow/deny validator, rest of arguments is for validator function
     * @returns {boolean}
     */
    validateUniverseRule(type, ...args) {
        var allowFns = UniUtils.get(this, '_universeValidators.' + type + '.allow');
        var denyFns = UniUtils.get(this, '_universeValidators.' + type + '.deny');
        if (!allowFns || allowFns.length === 0) {
            throw new Meteor.Error(
                403, "Access denied. No allow validators set on restricted " +
                "collection: '" + this.getCollectionName() + "', validator: '" + type + "'");
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

    _takeUniverseValidators(allowOrDeny, options) {
        var adTypes = _.union(this._universeAllowDenyTypes || []);
        if (!this._universeValidators) {
            this._universeValidators = {};
        }
        if (!options) {
            //init only
            return;
        }
        Object.keys(options).forEach(key => {
            let fn = options[key];
            if (_.contains(adTypes, key)) {
                if (typeof fn !== "function") {
                    throw new Error(allowOrDeny + ': Value for `' + key + '` must be a function');
                }
                var arr = UniUtils.get(this._universeValidators, key + '.' + allowOrDeny, []);
                arr.push(fn);
                UniUtils.set(this._universeValidators, key + '.' + allowOrDeny, arr);
            }
        });
        return _.omit(options, adTypes);
    }

    static _uniCollections:Object;

    static isDocumentFromCollection(doc, collectionName) {
        if (typeof doc === 'object' && doc.getCollection) {
            return doc.getCollectionName() === collectionName;
        }
    }

};

UniCollection._uniCollections = {};
