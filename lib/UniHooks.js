'use strict';

/**
 * Adds new hook, which will be launched before method: 'hookName'
 * @param {string} hookName Name of method before what hook will be called
 * @param {...Array} args
 * @param {string=} args.idName (optional) Unique name of hook, it's used to managing of hooks ( e.g. removing selected )
 * @param {Function} args.method Handler, that will be called. If this function returns exactly false,
 * it stops execution of current invocation (including before hooks that did not manage to be launched)
 * @param {boolean=false} args.isOverride Replace existing one, if defined
 * @returns {*}
 */
UniCollection.prototype.onBeforeCall = function onBeforeCall (hookName, ...args) {
    let idName = 'unnamed_' + Random.id(), method, isOverride;
    if (typeof args[0] === 'function') {
        [method, isOverride] = args;
    } else {
        [idName, method, isOverride] = args;
    }
    return addHook.call(this, 'before', hookName, idName, method, isOverride);
};
/**
 * Adds new hook, which will be launched after method: 'hookName'
 * @param {string} hookName Name of method after what hook will be called
 * @param {...Array} args
 * @param {string=} args.idName Unique name of hook, it's used to managing of hooks ( e.g. removing selected )
 * @param {Function} args.method Function of this hook, that will be called after.
 * @param {boolean=false} args.isOverride Replace existing one, if defined
 * @returns {*}
 */
UniCollection.prototype.onAfterCall = function (hookName, ...args) {
    let idName = 'unnamed_' + Random.id(), method, isOverride;
    if (typeof args[0] === 'function') {
        [method, isOverride] = args;
    } else {
        [idName, method, isOverride] = args;
    }
    return addHook.call(this, 'after', hookName, idName, method, isOverride);
};

/**
 * Removes a hook handler that was attached with .onBeforeCall
 * @param {string} hookName Name of method before that hook should be launched
 * @param {string} idName Unique name of handler
 * @returns {*}
 */
UniCollection.prototype.offBeforeCall = function (hookName, idName) {
    return removeHook.call(this, 'before', hookName, idName);
};

/**
 * Removes a hook handler that was attached with .onAfterCall
 * @param {string} hookName Name of method after that hook should be launched
 * @param {string} idName Unique name of handler
 * @returns {*}
 */
UniCollection.prototype.offAfterCall = function (hookName, idName) {
    return removeHook.call(this, 'after', hookName, idName);
};

/**
 * Any method that will be called in this, will be called directly without hooks
 * @param {Function} func
 * @param {[string]|string="ALL"} omitted an array of hooks that are omitted, like ALL, BEFORE, AFTER or hookId
 * @example
 * myCollection.withoutHooks(function () {
 *      myCollection.update('abc234', {$set: {title: 'Updated without hooks!'}})
 * });
 * @returns {*}
 */
UniCollection.prototype.withoutHooks = function (func, omitted = 'ALL') {
    const context = this;
    if (omitted && !Array.isArray(omitted)) {
        omitted = [omitted];
    }
    return hooksVars.withValue(omitted, function () {
        return func.apply(context);
    });
};

var LIST_WITH_NO_CALLBACK = {find: 'find', findOne: 'findOne', setSchema: 'setSchema', create: 'create'}, LIST_ALL;
if (Meteor.isServer) {
    LIST_ALL = {
        insert: '_collection.insert',
        update: '_collection.update',
        remove: '_collection.remove',
        upsert: '_collection.upsert',
        ...LIST_WITH_NO_CALLBACK
    };
} else {
    LIST_ALL = {
        insert: 'insert',
        update: 'update',
        remove: 'remove',
        upsert: 'upsert',
        ...LIST_WITH_NO_CALLBACK
    };
}

const getDocsForHooks = function getDocForHooks (ctx, [selector, modifierOrOptions], fnName) {
    const docs = ctx.getCollection().find(selector, {transform: null}).fetch();
    let insts;
    ctx.getPreviousDocs = (plainObject) => (
        plainObject
            ? docs
            : insts
                ? insts
                : insts = docs.map(d => ctx.getCollection().create(d))
    );
    if (fnName === 'update' || fnName === 'upsert') {
        ctx.getFields = () => UniUtils.getFieldsFromUpdateModifier(modifierOrOptions)
    }
};

const DOCUMENTS_GETTERS = {
    update: getDocsForHooks,
    remove: getDocsForHooks,
    upsert: getDocsForHooks
};

/**
 * Wraps methods with hooks mechanism
 * @param {UniCollection} uniCol instance of collection
 * @param {string} fnName name of function, witch will be wrapped
 * @param {Function} methodForHooking function to wrapping
 * @param {boolean} canBeAsync if method can have a callback passed in last parameter
 * @param {Function} attachSpecificHelpers function that can add some specific stuff to context of hooks
 * @returns {Function} wrapped function
 */
const wrapWithHooks = function wrapWithHooks (uniCol, fnName, methodForHooking, canBeAsync, attachSpecificHelpers) {
    return function (...args) {
        if (hooksVars.get() && _.contains(hooksVars.get(), 'ALL')) {
            return methodForHooking.call(this, ...args);
        }
        const getCollection = () => uniCol;
        const getMethodName = () => fnName;
        const getMethodContext = () => this;
        let cb;
        let executionContext = {
            getCollection,
            getMethodName,
            getMethodContext
        };
        if (canBeAsync) {
            if (typeof args[args.length - 1] === 'function') {
                cb = args.pop();
            }
            executionContext.getCallback = () => cb;
            executionContext.setCallback = (callback) => cb = callback;
        }
        if (typeof attachSpecificHelpers === 'function') {
            attachSpecificHelpers(executionContext, args, fnName);
        }
        if (runBeforeHooks.call(uniCol, fnName, args, executionContext, !!cb)) {
            if (canBeAsync) {
                delete executionContext.getCallback;
                delete executionContext.setCallback;
            }
            if (cb) {
                return methodForHooking.call(this, ...args, function (err, res) {
                    cb.apply(this, arguments);
                    executionContext.getResult = () => res;
                    runAfterHooks.call(uniCol, fnName, args, executionContext);
                });
            }
            const res = methodForHooking.call(this, ...args);
            executionContext.getResult = () => res;
            runAfterHooks.call(uniCol, fnName, args, executionContext);
            return res;
        }
        cb && cb(executionContext.catchedException ||
            Error('Action \'' + fnName + '\' blocked by hook \'' + executionContext.currentHookId + '\'')
        );
    };
};
// wrapping default function with hook mechanism
const _init = UniCollection.prototype._init;
UniCollection.prototype._init = function () {
    Object.keys(LIST_ALL).forEach(fnName => {
        let pathToFn = LIST_ALL[fnName];
        UniUtils.set(this, pathToFn, wrapWithHooks(
            this,
            fnName,
            UniUtils.get(this, pathToFn),
            !_.contains(LIST_WITH_NO_CALLBACK, fnName),
            DOCUMENTS_GETTERS[fnName]
        ));
    });
    _init.apply(this, arguments);
};

// wrapping remote methods (on collection) with hook mechanism
const _methods = UniCollection.prototype.methods;
UniCollection.prototype.methods = function (methods, ...args) {
    Object.keys(methods).forEach(name => {
        let rawMethod = methods[name];
        methods[name] = wrapWithHooks(this, name, rawMethod, false);
    });
    return _methods.call(this, methods, ...args);
};

// wrapping remote methods (on documents) with hook mechanism
const _docMethods = UniCollection.prototype.docMethods;
UniCollection.prototype.docMethods = function (methods, ...args) {
    const docGetter = function docGetter (ctx) {
        ctx.getPreviousDoc = () => ctx.getMethodContext().document;
    };
    Object.keys(methods).forEach(name => {
        let rawMethod = methods[name];
        methods[name] = wrapWithHooks(this, name, rawMethod, true, docGetter);
    });
    return _docMethods.call(this, methods, ...args);
};

function runBeforeHooks (methodName, args, context, isAsync) {
    const ommit = hooksVars.get() || [];
    if (_.contains(ommit, 'BEFORE')) {
        return true;
    }
    var hooks = UniUtils.get(this, '_hooks.before.' + methodName) || {};
    context.isAfter = () => false;
    return Object.keys(hooks).every(idName => {
        if (_.contains(ommit, idName)){
            return true;
        }
        context.currentHookId = idName;
        if (isAsync) {
            try {
                return hooks[idName].apply(context, args) !== false;
            } catch (e) {
                context.catchedException = e;
                return false;
            }
        }
        return hooks[idName].apply(context, args) !== false;
    });
}

function runAfterHooks (methodName, args, context) {
    const ommit = hooksVars.get() || [];
    if (_.contains(ommit, 'AFTER')) {
        return true;
    }
    var hooks = UniUtils.get(this, '_hooks.after.' + methodName) || {};
    context.isAfter = () => true;
    return Object.keys(hooks).every(idName => {
        if (_.contains(ommit, idName)){
            return true;
        }
        context.currentHookId = idName;
        return hooks[idName].apply(context, args) !== false;
    });
}

function addHook (type, methodName, idName, method, isOverride) {
    check(methodName, String);
    check(idName, String);
    check(method, Function);
    if (!isOverride && UniUtils.get(this, '_hooks.' + type + '.' + methodName + '.' + idName)) {
        throw new Error('Hook ' + type + ' ' + methodName + ' under id \'' + idName + '\' already exists. ' +
            'Pass true as argument isOverride to override.');
    }
    UniUtils.set(this, '_hooks.' + type + '.' + methodName + '.' + idName, method);
}

function removeHook (type, methodName, idName) {
    check(methodName, String);
    check(idName, String);
    let hook = UniUtils.get(this, '_hooks.' + type + '.' + methodName);
    return hook && delete hook[idName];
}

var hooksVars = new Meteor.EnvironmentVariable();
