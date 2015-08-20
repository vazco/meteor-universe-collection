'use strict';

/**
 * Allow users to add new type for method allow/deny to this collection.
 * @param name name of type for methods allow, deny like 'insert', 'update'....
 */
UniCollection.prototype.addNewAllowDenyValidatorType = function (name) {
    this._universeAllowDenyTypes = this._universeAllowDenyTypes || [];
    if (!name) {
        throw new Error('Missing name of validator');
    }
    if (!_.contains(this._universeAllowDenyTypes, name)) {
        this._universeAllowDenyTypes.push(name);
    }
};

UniCollection.prototype.allow = function (options) {
    Mongo.Collection.prototype.allow.call(this, this._takeUniverseValidators('allow', options));
};

UniCollection.prototype.deny = function (options) {
    Mongo.Collection.prototype.deny.call(this, this._takeUniverseValidators('deny', options));
};

/**
 * This methods checks if for selected arguments the rule pass true
 * @params {*} type of allow/deny validator, rest of arguments is for validator function
 * @returns {boolean}
 */
UniCollection.prototype.validateUniverseRule = function () {
    var type = arguments[0];
    var allowFns = UniUtils.get(this, '_universeValidators.' + type + '.allow');
    var denyFns = UniUtils.get(this, '_universeValidators.' + type + '.deny');
    if (!allowFns || allowFns.length === 0) {
        throw new Meteor.Error(
            403, "Access denied. No allow validators set on restricted " +
            "collection, validator: '" + type + "'");
    }
    var args = Array.prototype.slice.call(arguments, 1);
    var self = this;
    if ((denyFns && denyFns.length && _.some(denyFns, function (fn) {
            return fn.apply(self, args);
        })) || !_.some(allowFns, function (fn) {
            return fn.apply(self, args);
        })) {
        throw new Meteor.Error('403', 'Access denied.');
    }
    return true;
};


UniCollection.prototype._takeUniverseValidators = function (allowOrDeny, options) {
    var adTypes = _.union(this._universeAllowDenyTypes || []);
    var self = this;
    if (!self._universeValidators) {
        self._universeValidators = {};
    }
    if (!options) {
        //init only
        return;
    }
    _.each(options, function (fn, key) {
        if (_.contains(adTypes, key)) {
            if (!_.isFunction(fn)) {
                throw new Error(allowOrDeny + ': Value for `' + key + '` must be a function');
            }
            var arr = UniUtils.get(self._universeValidators, key + '.' + allowOrDeny, []);
            arr.push(fn);
            UniUtils.set(self._universeValidators, key + '.' + allowOrDeny, arr);
        }
    });
    return _.omit(options, adTypes);
};
