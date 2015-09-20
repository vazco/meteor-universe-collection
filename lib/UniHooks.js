/**
 * Adds new hook, which will be launched before method: "hookName"
 * @param {string} hookName name of method before what hook will be called
 * @param {string} idName Unique name of hook, it's used to managing of hooks ( e.g. removing selected )
 * @param {Function} method function of this hook, that will be called. If this function returns exactly false,
 * it stops execution of current invocation (including before hooks that did not manage to be launched)
 * @param {boolean} isOverride replace existing one, if defined
 * @returns {*}
 */
UniCollection.prototype.onBeforeCall = function(hookName, idName, method, isOverride) {
    return addHook.call(this, 'before', hookName, idName, method, isOverride);
};
/**
 * Adds new hook, which will be launched after method: "hookName"
 * @param {string} hookName name of method after what hook will be called
 * @param {string} idName Unique name of hook, it's used to managing of hooks ( e.g. removing selected )
 * @param {Function} method function of this hook, that will be called after.
 * @param {boolean} isOverride replace existing one, if defined
 * @returns {*}
 */
UniCollection.prototype.onAfterCall = function(hookName, idName, method, isOverride) {
    return addHook.call(this, 'after', hookName, idName, method, isOverride);
};

UniCollection.prototype.offBeforeCall = function(hookName, idName) {
    return removeHook.call(this, 'before', hookName, idName);
};

UniCollection.prototype.offAfterCall = function(hookName, idName) {
    return removeHook.call(this, 'after', hookName, idName);
};

var LIST_WITH_NO_CALLBACK = {find:'find', findOne:'findOne', setSchema:'setSchema', create:'create'}, LIST_ALL;
if(Meteor.isServer){
    LIST_ALL = {
        insert:'_collection.insert',
        update:'_collection.update',
        remove:'_collection.remove',
        upsert:'_collection.upsert',
        ...LIST_WITH_NO_CALLBACK};
} else{
    LIST_ALL = {
        insert:'insert',
        update:'update',
        remove:'remove',
        upsert:'upsert',
        ...LIST_WITH_NO_CALLBACK};
}

/**
 * Wraps methods with hooks mechanism
 * @param {UniCollection} uniCol instance of collection
 * @param {string} fnName name of function, witch will be wrapped
 * @param {Function} methodForHooking function to wrapping
 * @param {boolean} canBeAsync if method can have a callback passed in last parameter
 * @returns {Function} wrapped function
 */
const wrapWithHooks = function(uniCol, fnName, methodForHooking, canBeAsync){
    UniUtils.set(uniCol.direct, fnName, methodForHooking);
    return function(...args){
        const getCollection = () => uniCol;
        const getMethodName = () => fnName;
        const getMethodContext = () => this;
        let cb, executionContext = {
            getCollection,
            getMethodName,
            getMethodContext,
            callDirect: methodForHooking.bind(this)
        };
        if(canBeAsync && typeof args[args.length - 1] === "function"){
            cb = args.pop();
        }
        if(runBeforeHooks.call(uniCol, fnName, args, executionContext, !!cb)){
            if(cb){
                return methodForHooking.call(this, ...args, function(err, res){
                    cb.apply(this, arguments);
                    executionContext.return = res;
                    runAfterHooks.call(uniCol, fnName, args, executionContext);
                });
            }
            executionContext.return = methodForHooking.call(this, ...args);
            runAfterHooks.call(uniCol, fnName, args, executionContext);
            return executionContext.return;
        }
        cb && cb( executionContext.catchedException ||
            Error('Action "'+fnName+'" blocked by hook "'+executionContext.currentHookId+'"'));
    };
};
// Container on direction methods
UniCollection.prototype.direct = {};
// wrapping default function with hook mechanism
const _init = UniCollection.prototype._init;
UniCollection.prototype._init = function (){
    Object.keys(LIST_ALL).forEach(fnName => {
        let pathToFn = LIST_ALL[fnName];
        UniUtils.set(this, pathToFn, wrapWithHooks(this, fnName, UniUtils.get(this, pathToFn), !_.contains(LIST_WITH_NO_CALLBACK, fnName)));
    });
    _init.apply(this, arguments);
};

// wrapping remote methods (on collection) with hook mechanism
const _methods = UniCollection.prototype.methods;
UniCollection.prototype.methods = function(methods, ...args){
    Object.keys(methods).forEach(name => {
        let rawMethod = methods[name];
        methods[name] = wrapWithHooks(this, name, rawMethod, true);
    });
    return _methods.call(this, methods, ...args);
};

// wrapping remote methods (on documents) with hook mechanism
const _docMethods = UniCollection.prototype.docMethods;
UniCollection.prototype.docMethods = function(methods, ...args){
    Object.keys(methods).forEach(name => {
        let rawMethod = methods[name];
        methods[name] = wrapWithHooks(this, 'UniDoc.'+name, rawMethod, true);
    });
    return _docMethods.call(this, methods, ...args);
};

function runBeforeHooks(methodName, args, context, isAsync) {
    var hooks = UniUtils.get(this, '_hooks.before.'+methodName) || {};
    context.hookType = 'before';
    return Object.keys(hooks).every(idName => {
        context.currentHookId = idName;
        if(isAsync){
            try {
                return hooks[idName].apply(context, args) !== false;
            } catch(e){
                context.catchedException = e;
                return false;
            }
        }
        return hooks[idName].apply(context, args) !== false;
    });
}

function runAfterHooks(methodName, args, context) {
    var hooks = UniUtils.get(this, '_hooks.after.'+methodName) || {};
    context.hookType = 'after';
    return Object.keys(hooks).every(idName => {
        context.currentHookId = idName;
        return hooks[idName].apply(context, args) !== false;
    });
}

function addHook (type, methodName, idName, method, isOverride) {
    check(methodName, String);
    check(idName, String);
    check(method, Function);
    if(!isOverride && UniUtils.get(this, '_hooks.'+type+'.'+methodName+'.'+idName)) {
        throw new Error('Hook '+type+' '+methodName+' under id "'+idName+'" already exists. ' +
            'Pass true as argument isOverride to override.');
    }
    UniUtils.set(this, '_hooks.'+type+'.'+methodName+'.'+idName, method);
}

function removeHook (type, methodName, idName) {
    check(methodName, String);
    check(idName, String);
    let hook = UniUtils.get(this, '_hooks.'+type+'.'+methodName);
    return hook && delete hook[idName];
}
