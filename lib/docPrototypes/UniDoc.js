'use strict';
/**
 * @name UniCollection.UniDoc
 * @param doc
 * @returns {any}
 * @constructor
 */
var UniDoc = function (doc) {
    return _.extend(this, doc);
};

UniDoc.extend = function(){
    var UniverseDoc = function (doc) {
        UniDoc.call(this, doc);
    };

    var surrogate = function () {
        this.constructor = UniverseDoc;
    };
    surrogate.prototype = UniDoc.prototype;
    /*jshint -W055 */
    UniverseDoc.prototype = new surrogate();
    UniverseDoc.extend = this.extend;
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
    if(_.isObject(options) && options.direct && col.direct){
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
    if(_.isObject(options) && options.direct && col.direct){
        col = col.direct;
    }
    if(_.isFunction(options) && !cb){
        cb = options;
    }
    return col.remove(this._id, cb);
};
/**
 * Saves selected keys in current document
 * @param fieldsList name or array with names of fields to save
 * @returns {*}
 */
UniDoc.prototype.save = function (fieldsList) {
    if(_.isString(fieldsList)){
        fieldsList = [fieldsList];
    }
    if(!_.isArray(fieldsList)){
        throw new Meteor.Error(500, 'You must pass list of keys for save');
    }
    var obj = _.pick(this, fieldsList);
    return this.update({$set:obj});
};
/**
 * Update fields in current document
 */
UniDoc.prototype.refresh = function () {
    var doc = this.getCollection().findOne(this._id);
    var self = this;
    _.each(self, function(v, k){
        if(doc[k]){
            self[k] = doc[k];
        } else{
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
UniDoc.prototype.toJSONValue = function(){
    var value = {};
    _.each(this, function(v,k){ value[k] = EJSON.toJSONValue(v); });
    return value;
};

/**
 * Return the tag used to identify this type.
 * @returns {string}
 */
UniDoc.prototype.typeName = function(){
    return this.getCollection()._name+'Doc';
};

UniCollection.UniDoc = UniDoc;
