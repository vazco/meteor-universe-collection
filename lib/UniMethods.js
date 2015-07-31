'use strict';

UniCollection.prototype.methods = function(methods, isOverride){
    this._methodHandlersToCall = this._methodHandlersToCall || {};
    _.extend(this._methodHandlersToCall, methods);
    if(isOverride){
        return;
    }
    var name = this.collectionName(), handlers = {};
    var coll = this;
    _.each(methods, function(fn, k){
        handlers['/'+name+'/'+k] = function(){
            this.collection = coll;
            var m = coll._methodHandlersToCall[k];
            if(!_.isFunction(m)){
                throw Meteor.Error(404, 'Remote method in collection "'+name+'" not found');
            }
            return m.apply(this, arguments);
        };
    });
};

UniCollection.prototype.apply = function(){
    var args = Array.prototype.slice.call(arguments, 1);
    var callback;
    if (args.length && typeof args[args.length - 1] === 'function'){
        callback = args.pop();
    }
    return Meteor.apply('/'+this.collectionName()+'/'+arguments[0], args, callback)
};

UniCollection.prototype.call = function(){
    return this.apply(this, arguments);
};