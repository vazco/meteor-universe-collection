'use strict';

UniCollection.prototype.methods = function (methods, isOverride) {
    this._methodHandlersToCall = this._methodHandlersToCall || {};
    _.extend(this._methodHandlersToCall, methods);
    if (isOverride) {
        return;
    }
    var name = this.getCollectionName(), handlers = {};
    var coll = this;
    _.each(methods, function (fn, k) {
        handlers['/' + name + '/' + k] = function () {
            this.collection = coll;
            var m = coll._methodHandlersToCall[k];
            if (!_.isFunction(m)) {
                throw new Meteor.Error('404', 'Remote method in collection "' + name + '" not found');
            }
            if(Meteor.isServer){
                if(!launchedFromServerSide.get() && !coll.validateUniverseRule(k, this.userId, null, arguments, this)){
                    throw new Meteor.Error('403', 'Access denied.');
                }
                var context = this;
                return launchedFromServerSide.withValue(k, function () {
                    return m.apply(context, arguments);
                });
            } else {
                return m.apply(this, arguments);
            }
        };
    });
    return Meteor.methods(handlers);
};

UniCollection.prototype.apply = function () {
    var name = arguments[0];
    if(!name || !_.isString(name)){
        throw new Meteor.Error('404', 'Missing remote method name!');
    }
    var args = Array.prototype.slice.call(arguments, 1);
    var callback;
    if (args.length && typeof args[args.length - 1] === 'function') {
        callback = args.pop();
    }
    return Meteor.apply('/' + this.getCollectionName() + '/' + name, args, callback);
};

UniCollection.prototype.call = function () {
    return this.apply.apply(this, arguments);
};


UniCollection.prototype.docMethods = function (methods, isOverride) {
    this._methodHandlersToCall = this._methodHandlersToCall || {};
    _.extend(this._methodHandlersToCall, methods);
    if (isOverride) {
        return;
    }
    var name = this.getCollectionName(), handlers = {};
    var coll = this;
    _.each(methods, function (fn, k) {
        handlers['/' + name + '/UniDoc/' + k] = function () {
            this.collection = coll;
            this.document = coll.ensureUniDoc(arguments[0]);
            var m = coll._methodHandlersToCall[k];
            var args = Array.prototype.slice.call(arguments, 1);
            if (!_.isFunction(m)) {
                throw new Meteor.Error('404', 'Remote method in collection "' + name + '" not found');
            }
            if(Meteor.isServer){
                if(!launchedFromServerSide.get() && !coll.validateUniverseRule(k, this.userId, this.document, args, this)){
                    throw new Meteor.Error('403', 'Access denied.');
                }
                var context = this;
                return launchedFromServerSide.withValue(k, function () {
                    return m.apply(context, args);
                });
            } else {
                return m.apply(this, args);
            }
        };
    });
    return Meteor.methods(handlers);
};

if(Meteor.isServer){
    var launchedFromServerSide = new Meteor.EnvironmentVariable();
}
