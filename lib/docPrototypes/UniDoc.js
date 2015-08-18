'use strict';
/**
 * @name UniCollection.UniDoc
 * @param doc
 * @returns {any}
 * @constructor
 */
var UniDoc = function (doc) {
    if (!_.isObject(doc)) {
        doc = {};
    }
    this._keys = _.keys(doc);
    return _.extend(this, doc);
};

UniDoc.extend = function () {
    var UniverseDoc = function (doc) {
        UniDoc.call(this, doc);
    };

    var surrogate = function () {
        this.constructor = UniverseDoc;
    };
    surrogate.prototype = this.prototype;
    /*jshint -W055 */
    UniverseDoc.prototype = new surrogate();
    UniverseDoc.extend = this.extend;
    //onExtend
    return UniverseDoc;
};

/**
 * Performs update on current document
 * @param modifier
 * @param options (optional) Same as Mongo.Collection.update has, but extended by additional parameter:
 * @param options.direct Boolean - It helps circumvent any defined hooks by plugin matb33/meteor-collection-hooks
 * @param cb
 * @returns {*}
 */
UniDoc.prototype.update = function (modifier, options, cb) {
    var col = this.getCollection();
    if (_.isObject(options) && options.direct && col.direct) {
        col = col.direct;
    }
    return col.update(this._id, modifier, options, cb);
};
/**
 * Performs remove on current document
 * @param options.direct Boolean - It helps circumvent any defined hooks by plugin matb33/meteor-collection-hooks
 * @param cb
 * @returns {*}
 */
UniDoc.prototype.remove = function (options, cb) {
    var col = this.getCollection();
    if (_.isObject(options) && options.direct && col.direct) {
        col = col.direct;
    }
    if (_.isFunction(options) && !cb) {
        cb = options;
    }
    return col.remove(this._id, cb);
};
/**
 * Saves selected keys in current document
 * @param {Object|String|[String]} options or name or array with names of fields to save
 * @param {[String]=} options.fieldsList array with names of fields to save
 * @param {[String]=} options.callback callback(error, result)
 * @param {String=} options.useSchema name of scheme
 * @param {Function} cb callback
 * @returns {*} status of operation or id of new doc
 */
UniDoc.prototype.save = function (options, cb) {
    var self = this, fieldsList, schema;
    if (!_.isFunction(cb) && _.isFunction(options)) {
        cb = options;
        options = undefined;
    }
    if (_.isObject(options) && !_.isArray(options)) {
        fieldsList = options.fieldsList;
        cb = cb || options.callback;
        if (options.useSchema) {
            schema = this.getSchema(options.useSchema);
        }
    } else {
        options = {};
    }

    if (_.isString(options)) {
        fieldsList = [options];
    }

    if (!_.isArray(fieldsList)) {
        if (!schema) {
            schema = this.getSchema();
        }
        fieldsList = schema ? schema.objectKeys() : this._keys;
    }
    var obj = _.pick(this, fieldsList);
    if (!this._id) {
        return this.insert(obj, {useSchema: options.useSchema}, function (err, res) {
            if (err && !cb) {
                Meteor._debug(err);
                return;
            }
            self._id = res;
            cb && cb(err, self);
        });
    }
    return !!this.update({$set: obj}, {useSchema: options.useSchema}, function (err) {
        if (err && !cb) {
            Meteor._debug(err);
            return;
        }
        cb && cb(err, self);
    });
};

UniDoc.prototype.set = function (name, value) {
    if (!name || name === '_id') {
        throw new Error('Missing name of property or property is forbidden to edit.');
    }
    if (!_.contains(this._keys, name)) {
        this._keys.push(name);
    }
    this[name] = value;
};

UniDoc.prototype.getCollection = function () {
    throw new Error('Instance of this UniDoc is not bound with any collection');
};

UniDoc.prototype.getSchema = function () {
    var col = this.getCollection();
    return col.getSchema();
};

/**
 * Update fields in current document
 */
UniDoc.prototype.refresh = function () {
    var doc = this.getCollection().findOne(this._id);
    var self = this;
    _.each(self, function (v, k) {
        if (doc[k]) {
            self[k] = doc[k];
        } else {
            delete self[k];
        }
    });
};
/**
 * Returns fresh instance of current document using id of this doc
 * @returns {any}
 */
UniDoc.prototype.findSelf = function () {
    return this.getCollection().findOne(this._id);
};

/**
 * Serialize instance into a JSON-compatible value.
 * @returns {Object}
 */
UniDoc.prototype.toJSONValue = function () {
    var value = {};
    _.each(this, function (v, k) {
        value[k] = EJSON.toJSONValue(v);
    });
    return value;
};

/**
 * Return the tag used to identify this type.
 * @returns {string}
 */
UniDoc.prototype.typeName = function () {
    return this.getCollection()._name + 'Doc';
};

UniDoc.prototype.getCollectionName = function () {
    return this.getCollection()._name;
};

/**
 * @summary Invoke a collection method passing an array of arguments.
 * @locus Anywhere
 * @param {String} name Name of method to invoke
 * @param {EJSONable[]} args Method arguments
 * @param {Function} [asyncCallback] Optional callback;
 */
UniDoc.prototype.apply = function () {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!arguments[0] || !_.isString(arguments[0])) {
        throw new Meteor.Error('404', 'Missing remote method name!');
    }
    var arr = ['UniDoc/' + arguments[0], this._id];
    var coll = this.getCollection();
    coll.apply.apply(this, _.union(arr, args));
};

/**
 * Invokes a document method passing any number of arguments.
 * @locus Anywhere
 * @param {String} name Name of method to invoke
 * @param {EJSONable} [arg1,arg2...] Optional method arguments
 * @param {Function} [asyncCallback] Optional callback, which is called asynchronously with the error or result after the method is complete.
 * If not provided, the method runs synchronously if possible (see below).
 * @returns {any}
 */
UniDoc.prototype.call = function () {
    return this.apply.apply(this, arguments);
};

UniCollection.UniDoc = UniDoc;

