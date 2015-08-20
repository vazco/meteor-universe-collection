'use strict';
/**
 *     Remote methods on collection that can be invoked over the network by clients from collection instance.
 *  From UniCollection you can define and call remote methods (just like Meteor.methods and Meteor.call).
 *
 *  Additionally, handler from Meteor.methods,
 *  will be have in context a collection object under this.collection.
 *  Rest things like userId, connection are same.
 *
 *  Remote methods on collection are inspired by insert/update function
 *  and all of them have callbacks for allow/deny methods.
 *  Which are called on invocation, but only first method in single invocation stack is validated.
 *  It mean that one function on server side calls another, "allow/deny" validation will be checked only for first one.
 *
 *@example
 *  var collection = new UniCollection('some');
 *  collection.methods({
 *       noneDirectly: function(){
 *           console.log('called by other');
 *       },
 *       getX: function(a, b, c){
 *           console.log(a, b, c);
 *       },
 *       getY: function(){
 *           if(Meteor.isServer){
 *              return this.collection.call('noneDirectly');
 *           }
 *       }
 *   });
 *  //also you can provide callbacks for deny function
 *  collection.allow({
 *       //value of document variable will be null for remote collection methods
 *       getX: function(userId, document, args, invocation){
 *           return true;
 *       },
 *       //only for remote methods from document will be have object of doc in this argument
 *       getY: function(userId, document, args, invocation){
 *               return true;
 *       }
 *   });
 *   //call with params
 *  collection.call('getX', 1, 2, 3);
 *  //Invoke a method passing an array of arguments.
 *   collection.apply('getX', [1, 2, 3]);
 *  //calling with callback
 *  collection.call('getY', function(error, result){ console.log(error, result); });
 *
 * @param methods
 * @param isOverride
 * @returns {any}
 */
UniCollection.prototype.methods = function (methods, isOverride) {
    this._methodHandlersToCall = this._methodHandlersToCall || {};
    var self = this;
    _.each(methods, function (func, name) {
        if (self._methodHandlersToCall[name]) {
            if (!isOverride) {
                throw new Error('A method named "' + name + '" is already defined');
            }
            self._methodHandlersToCall[name] = func;
            delete methods[name];
        } else {
            self._methodHandlersToCall[name] = func;
        }
    });
    var name = this.getCollectionName(), handlers = {};
    var coll = this;
    _.each(methods, function (fn, key) {
        if (!_.isFunction(fn)) {
            return;
        }
        coll.addNewAllowDenyValidatorType(key);
        handlers['/' + name + '/' + key] = function () {
            this.collection = coll;
            var method = coll._methodHandlersToCall[key];
            if (!_.isFunction(method)) {
                throw new Meteor.Error('404', 'Remote method in collection "' + name + '" not found');
            }
            if (Meteor.isServer) {
                if (!launchedFromServerSide.get() && !coll.validateUniverseRule(key, this.userId, null, arguments, this)) {
                    throw new Meteor.Error('403', 'Access denied.');
                }
                var context = this;
                return launchedFromServerSide.withValue(key, function () {
                    return method.apply(context, arguments);
                });
            } else {
                return method.apply(this, arguments);
            }
        };
    });
    return Meteor.methods(handlers);
};

/**
 * @summary Invoke a collection method passing an array of arguments.
 * @locus Anywhere
 * @param {String} name Name of method to invoke
 * @param {EJSONable[]} args Method arguments
 * @param {Function} [asyncCallback] Optional callback
 */
UniCollection.prototype.apply = function () {
    var name = arguments[0];
    if (!name || !_.isString(name)) {
        throw new Meteor.Error('404', 'Missing remote method name!');
    }
    var args = Array.prototype.slice.call(arguments, 1);
    var callback;
    if (args.length && typeof args[args.length - 1] === 'function') {
        callback = args.pop();
    }
    return Meteor.apply('/' + this.getCollectionName() + '/' + name, args, callback);
};

/**
 * Invokes a collection method passing any number of arguments.
 * @locus Anywhere
 * @param {String} name Name of method to invoke
 * @param {EJSONable} [arg1,arg2...] Optional method arguments
 * @param {Function} [asyncCallback] Optional callback, which is called asynchronously with the error or result after the method is complete.
 * If not provided, the method runs synchronously if possible (see below).
 * @returns {any}
 */
UniCollection.prototype.call = function () {
    return this.apply.apply(this, arguments);
};

/**
 *
 *Remote methods on document that can be invoked over the network by clients from document instance.
 *
 *Works in the same way as collection.methods but additionally handler will be have a document object in context
 *(this.document)
 *
 *@example
 *var collection = new UniCollection('some');
 *collection.docMethods({
 *       addItem: function(item){
 *           return this.document.update({$set: {item: item}});
 *       }
 *   });
 * also you can provide callbacks for deny function
 *collection.allow({
 *       addItem: function(userId, document, args, invocation){
 *           return true;
 *       }
 *   });
 *
 *var doc = collection.findOne();
 *doc.call('addItem', 'someItem', function(error, result){ console.log(error, result); });
 *
 * @param methods
 * @param isOverride if true ( before
 * @returns {any}
 */
UniCollection.prototype.docMethods = function (methods, isOverride) {
    this._methodHandlersToCall = this._methodHandlersToCall || {};
    var self = this;
    _.each(methods, function (func, name) {
        if (self._methodHandlersToCall['UniDoc/' + name]) {
            if (!isOverride) {
                throw new Error('A method named "' + name + '" is already defined');
            }
            self._methodHandlersToCall['UniDoc/' + name] = func;
            delete methods[name];
        } else {
            self._methodHandlersToCall['UniDoc/' + name] = func;
        }
    });
    var name = this.getCollectionName(), handlers = {};
    var coll = this;
    _.each(methods, function (fn, methodName) {
        if (!_.isFunction(fn)) {
            return;
        }
        coll.addNewAllowDenyValidatorType(methodName);
        handlers['/' + name + '/UniDoc/' + methodName] = function () {
            this.collection = coll;
            this.document = coll.ensureUniDoc(arguments[0]);
            var m = coll._methodHandlersToCall['UniDoc/' + methodName];
            var args = Array.prototype.slice.call(arguments, 1);
            if (!_.isFunction(m)) {
                throw new Meteor.Error('404', 'Remote method in document of collection "' + name + '" not found');
            }
            if (Meteor.isServer) {
                if (!launchedFromServerSide.get() && !coll.validateUniverseRule(methodName, this.userId, this.document, args, this)) {
                    throw new Meteor.Error('403', 'Access denied.');
                }
                var context = this;
                return launchedFromServerSide.withValue(methodName, function () {
                    return m.apply(context, args);
                });
            } else {
                return m.apply(this, args);
            }
        };
    });
    return Meteor.methods(handlers);
};

if (Meteor.isServer) {
    var launchedFromServerSide = new Meteor.EnvironmentVariable();
}
