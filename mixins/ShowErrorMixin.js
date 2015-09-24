/**
 * ShowErrorMixin
 * new ShowErrorMixin(params={})
 * params:
 *      name - name of mixin
 *      errorDisplayer - function that will be responsible as a showing the error message,
 *      like e.g. showError(exceptionOrString)
 *      addForMethods: //Adds only for this one
 *          insert: true, upsert: true, update: true, remove: true
 *          (as a value can be passed a custome function of errorDisplayer)
 */
class ShowErrorMixin extends UniCollection.AbstractMixin {
    constructor ({name = 'ShowError', ...params} = {}) {
        super(name);
        this.params = params;
    }

    mount (collection){
        if(Meteor.isClient) {
            const params = this.params;
            params.errorDisplayer = (params.errorDisplayer || this._showError).bind(collection);

            if (params.addForMethods) {
                Object.keys(params.addForMethods).forEach((fnName)=> {
                    let fn = params.addForMethods[fnName];
                    if(fn){
                        if(!this['_'+fnName]){
                            console.warn('ShowErrorMixin: Unknown method name:'+fnName);
                            return;
                        }
                        this['_'+fnName].call(collection, typeof fn === 'function'? fn : params.errorDisplayer);
                    }
                });
                return;
            }
            this._all(collection, params.errorDisplayer);
        }
    }
    _showError(text) {
        if (_.isObject(text)) {
            text = text.reason || text.message;
        }
        var uiShowErr;
        if (typeof UniUI === 'object') {
            uiShowErr = UniUI.setErrorMessage;
        } else if (UniUtils.setErrorMessage) {
            uiShowErr = UniUtils.setErrorMessage;
        }
        if (uiShowErr) {
            uiShowErr('header', text);
        } else {
            alert(text);
        }
    }

    /**
     * Adds error support for all updates on client side, even if callback for update wasn't provided.
     * When update is unsuccessful function 'onErrorFn' will be called
     * @param {function=} onErrorFn (optional) If is not passed then Vazco.setErrorMessage for 'header' place will be called
     * or alert if Vazco.setErrorMessage is missing (You can override this logic by replacing UniCollection._showError)
     */
    _update(onErrorFn) {
        var _update = this.update;
        var collection = this;
        if (!_.isFunction(onErrorFn)) {
            onErrorFn = UniCollection._showError;
        }
        this.update = function () {
            var self = this;
            var params = _.toArray(arguments);
            var ind = params.length - 1;
            if (ind > 0) {
                var fn = params[ind];
                var callback = function () {
                    if (arguments.length && arguments[0]) {
                        console.error(
                            collection._name + ' - update: ' + arguments[0].reason || arguments[0].message,
                            '- arguments: ', params
                        );
                        onErrorFn(arguments[0]);
                    }
                    if (_.isFunction(fn)) {
                        fn.apply(self, arguments);
                    }
                };
                if (_.isFunction(fn)) {
                    params[ind] = callback;
                } else {
                    params.push(callback);
                }

            }
            return _update.apply(self, params);
        };
    }

    /**
     * Adds error support for all inserts on client side, even if callback for update wasn't provided.
     * When update is unsuccessful function 'onErrorFn' will be called
     * @param {function=} onErrorFn
     */
    _insert(onErrorFn) {
        var _insert = this.insert;
        var collection = this;
        this.insert = function () {
            var self = this;
            var params = _.toArray(arguments);
            var ind = params.length - 1;
            if (ind > 0) {
                var fn = params[ind];
                var callback = function () {
                    if (arguments.length && arguments[0]) {
                        console.error(
                            collection._name + ' - insert: ' + arguments[0].reason || arguments[0].message,
                            '- arguments: ', params
                        );
                        onErrorFn(arguments[0]);
                    }
                    if (_.isFunction(fn)) {
                        fn.apply(self, arguments);
                    }
                };
                if (_.isFunction(fn)) {
                    params[ind] = callback;
                } else {
                    params.push(callback);
                }

            }
            return _insert.apply(self, params);
        };
    }

    /**
     * Adds error support for all removes on client side, even if callback for update wasn't provided.
     * When update is unsuccessful function 'onErrorFn' will be called
     * @param {function=} onErrorFn
     * */
    _remove(onErrorFn) {
        var _remove = this.remove;
        var collection = this;
        this.remove = function () {
            var self = this;
            var params = _.toArray(arguments);
            var ind = params.length - 1;
            if (ind > 0) {
                var fn = params[ind];
                var callback = function () {
                    if (arguments.length && arguments[0]) {
                        console.error(
                            collection._name + ' - remove: ' + arguments[0].reason || arguments[0].message,
                            '- arguments: ', params
                        );
                        onErrorFn(arguments[0]);
                    }
                    if (_.isFunction(fn)) {
                        fn.apply(self, arguments);
                    }
                };
                if (_.isFunction(fn)) {
                    params[ind] = callback;
                } else {
                    params.push(callback);
                }

            }
            return _remove.apply(self, params);
        };
    }

;

    /**
     * Adds error support for all upserts on client side, even if callback for update wasn't provided.
     * When update is unsuccessful function 'onErrorFn' will be called
     * @param {function=} onErrorFn
     * */
    _upsert(onErrorFn) {
        var _upsert = this.upsert;
        var collection = this;
        this.upsert = function () {
            var self = this;
            var params = _.toArray(arguments);
            var ind = params.length - 1;
            if (ind > 0) {
                var fn = params[ind];
                var callback = function () {
                    if (arguments.length && arguments[0]) {
                        console.error(
                            collection._name + ' - upsert: ' + arguments[0].reason || arguments[0].message,
                            '- arguments: ', params
                        );
                        onErrorFn(arguments[0]);
                    }
                    if (_.isFunction(fn)) {
                        fn.apply(self, arguments);
                    }
                };
                if (_.isFunction(fn)) {
                    params[ind] = callback;
                } else {
                    params.push(callback);
                }

            }
            return _upsert.apply(self, params);
        };
    }

;
    /**
     * Adds error callback to each one write methods {insert, update, upsert, remove}
     * @param {function=} onErrorFn
     */
    _all(collection, onErrorFn) {
        this._insert.call(collection, onErrorFn);
        this._upsert.call(collection, onErrorFn);
        this._update.call(collection, onErrorFn);
        this._remove.call(collection, onErrorFn);
    }
}

UniCollection.mixins.BackupMixin = BackupMixin;
