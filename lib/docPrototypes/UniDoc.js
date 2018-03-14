import {isObject, isFunction, isString} from '../utils';

/**
 * @name UniDoc
 * @param doc
 * @returns {*}
 * @constructor
 */
export class UniDoc {
    constructor (doc) {
        if (typeof doc !== 'object') {
            doc = {};
        }
        Object.keys(doc).forEach((key) => {
            this[key] = doc[key];
        });
    }

    /**
     * Performs update on current document
     * @param modifier
     * @param options (optional) Same as Mongo.Collection.update has, but extended by additional parameter:
     * @param options.direct Boolean - It helps circumvent any defined hooks by plugin matb33/meteor-collection-hooks
     * @param cb
     * @returns {*}
     */
    update (modifier, options = {}, cb = undefined) {
        var col = this.getCollection();
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        if (options.direct && col.direct) {
            col = col.direct;
        }
        return col.update(this._id, modifier, options, cb);
    }
    /**
     * Performs remove on current document
     * @param options
     * @param options.direct Boolean - It helps circumvent any defined hooks by plugin matb33/meteor-collection-hooks
     * @param cb
     * @returns {*}
     */
    remove (options, cb) {
        var col = this.getCollection();
        if (isObject(options) && options.direct && col.direct) {
            col = col.direct;
        }
        if (isFunction(options) && !cb) {
            cb = options;
        }
        return col.remove(this._id, cb);
    }
    /**
     * Saves selected keys in current document
     * @param {Object|String|[String]} options or name or array with names of fields to save
     * @param {[String]=} options.fieldsList array with names of fields to save
     * @param {[String]=} options.callback callback(error, result)
     * @param {String=} options.useSchema name of scheme
     * @param {Function} cb callback
     * @returns {*} status of operation or id of new doc
     */
    save (options, cb) {
        /*eslint complexity:0*/
        var self = this, fieldsList, schema;
        if (!isFunction(cb) && isFunction(options)) {
            cb = options;
            options = undefined;
        }

        if (isString(options)) {
            fieldsList = [options];
        }

        if (isObject(options) && !Array.isArray(options)) {
            fieldsList = options.fieldsList;
            cb = cb || options.callback;
            if (options.useSchema) {
                schema = this.getSchema(options.useSchema);
            }
        } else {
            options = {};
        }

        if (!Array.isArray(fieldsList)) {
            if (!schema) {
                schema = this.getSchema();
            }
            fieldsList = schema ? schema.objectKeys() : _.keys(this);
        }
        var obj = _.pick(this, fieldsList);
        if (!this._id || !this.getCollection().find(this._id, {reactive: false}).count()) {
            let col = (options.direct && this.getCollection().direct) || this.getCollection();
            if (Meteor.isServer && !isFunction(cb)) {
                this._id = col.insert(obj, {useSchema: options.useSchema});
                return this._id;
            }
            return col.insert(obj, {useSchema: options.useSchema}, function (err, res) {
                if (err && !cb) {
                    Meteor._debug(err);
                    return;
                }
                self._id = res;
                cb && cb(err, self);
            });
        }
        if (Meteor.isServer && !isFunction(cb)) {
            return !!this.update({$set: _.omit(obj, '_id')}, {useSchema: options.useSchema});
        }
        return !!this.update({$set: _.omit(obj, '_id')}, {useSchema: options.useSchema}, function (err) {
            if (err && !cb) {
                Meteor._debug(err);
                return;
            }
            cb && cb(err, self);
        });
    }

    getCollection () {
        throw new Error('Instance of this UniDoc is not bound with any collection');
    }

    getSchema () {
        return this.getCollection().getSchema(...arguments);
    }

    /**
     * Update fields in current document
     */
    refresh () {
        var doc = this.getCollection().findOne(this._id);
        Object.keys(this).forEach((k) => {
            delete this[k];
        });
        Object.keys(doc).forEach((k) => {
            this[k] = doc[k];
        });
    }
    /**
     * Returns fresh instance of current document using id of this doc
     * @returns {*}
     */
    findSelf () {
        return this.getCollection().findOne(this._id);
    }

    /**
     * Serialize instance into a JSON-compatible value.
     * @returns {Object}
     */
    toJSONValue () {
        var value = {};
        Object.keys(this).forEach(k => {
            if (!isFunction(this[k])) {
                value[k] = EJSON.toJSONValue(this[k]);
            }
        });
        return value;
    }

    /**
     * Return the tag used to identify this type.
     * @returns {string}
     */
    typeName () {
        return this.getCollectionName() + 'Doc';
    }

    getCollectionName () {
        return this.getCollection().getCollectionName();
    }

    /**
     * @summary Invoke a collection method passing an array of arguments.
     * @locus Anywhere
     * @param {String} name Name of method to invoke
     * @param {[EJSONable]} args Method arguments
     * @param {Function} callback Optional callback;
     */
    apply (name, args = [], callback) {
        args.unshift(this._id);
        var coll = this.getCollection();
        return coll.apply.call(this, 'UniDoc/'+name, args, callback);
    }

    /**
     * Invokes a document method passing any number of arguments.
     * @locus Anywhere
     * @param {String} name Name of method to invoke
     * @param {...EJSONable} args Optional method arguments
     * @param {Function} args[-1] Optional callback, which is called asynchronously with the error or result after the method is complete.
     * If not provided, the method runs synchronously if possible (see below).
     * @returns {*}
     */
    call (name, ...args) {
        if (!name || !isString(name)) {
            throw new Meteor.Error('404', 'Missing remote method name!');
        }
        var callback;
        if (args.length && typeof args[args.length - 1] === 'function') {
            callback = args.pop();
        }
        return this.apply(name, args, callback);
    }

}

UniDoc.extend = function () {
    const _this = this || UniDoc;
    return class UniverseDoc extends _this {};
};

export default UniDoc;


