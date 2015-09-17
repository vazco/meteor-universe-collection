
//UniCollection._showError = function (text) {
//    if (_.isObject(text)) {
//        text = text.reason || text.message;
//    }
//    var uiShowErr;
//    if (typeof UniUI === 'object') {
//        uiShowErr = UniUI.setErrorMessage;
//    } else if (UniUtils.setErrorMessage) {
//        uiShowErr = UniUtils.setErrorMessage;
//    }
//    if (uiShowErr) {
//        uiShowErr('header', text);
//    } else {
//        alert(text);
//    }
//};
//
///**
// * Adds error support for all updates on client side, even if callback for update wasn't provided.
// * When update is unsuccessful function 'onErrorFn' will be called
// * @param {function=} onErrorFn (optional) If is not passed then Vazco.setErrorMessage for 'header' place will be called
// * or alert if Vazco.setErrorMessage is missing (You can override this logic by replacing UniCollection._showError)
// */
//UniCollection.prototype.addErrorSupportToUpdates = function (onErrorFn) {
//    if (Meteor.isServer) {
//        console.log('Default of error support for ' + this._name + ' cannot be applied on server side');
//        return;
//    }
//    var _update = this.update;
//    var collection = this;
//    if (!_.isFunction(onErrorFn)) {
//        onErrorFn = UniCollection._showError;
//    }
//    this.update = function () {
//        var self = this;
//        var params = _.toArray(arguments);
//        var ind = params.length - 1;
//        if (ind > 0) {
//            var fn = params[ind];
//            var callback = function () {
//                if (arguments.length && arguments[0]) {
//                    console.error(
//                        collection._name + ' - update: ' + arguments[0].reason || arguments[0].message,
//                        '- arguments: ', params
//                    );
//                    onErrorFn(arguments[0]);
//                }
//                if (_.isFunction(fn)) {
//                    fn.apply(self, arguments);
//                }
//            };
//            if (_.isFunction(fn)) {
//                params[ind] = callback;
//            } else {
//                params.push(callback);
//            }
//
//        }
//        return _update.apply(self, params);
//    };
//};

///**
// * Adds error support for all inserts on client side, even if callback for update wasn't provided.
// * When update is unsuccessful function 'onErrorFn' will be called
// * @param {function=} onErrorFn (optional) If is not passed then Vazco.setErrorMessage for 'header' place will be called
// * or alert if Vazco.setErrorMessage is missing (You can override this logic by replacing UniCollection._showError)
// */
//UniCollection.prototype.addErrorSupportToInserts = function (onErrorFn) {
//    if (Meteor.isServer) {
//        console.log('Default of error support for ' + this._name + ' cannot be applied on server side');
//        return;
//    }
//    var _insert = this.insert;
//    var collection = this;
//    if (!_.isFunction(onErrorFn)) {
//        onErrorFn = UniCollection._showError;
//    }
//    this.insert = function () {
//        var self = this;
//        var params = _.toArray(arguments);
//        var ind = params.length - 1;
//        if (ind > 0) {
//            var fn = params[ind];
//            var callback = function () {
//                if (arguments.length && arguments[0]) {
//                    console.error(
//                        collection._name + ' - insert: ' + arguments[0].reason || arguments[0].message,
//                        '- arguments: ', params
//                    );
//                    onErrorFn(arguments[0]);
//                }
//                if (_.isFunction(fn)) {
//                    fn.apply(self, arguments);
//                }
//            };
//            if (_.isFunction(fn)) {
//                params[ind] = callback;
//            } else {
//                params.push(callback);
//            }
//
//        }
//        return _insert.apply(self, params);
//    };
//};
//
///**
// * Adds error support for all removes on client side, even if callback for update wasn't provided.
// * When update is unsuccessful function 'onErrorFn' will be called
// * @param {function=} onErrorFn (optional) If is not passed then Vazco.setErrorMessage for 'header' place will be called
// * or alert if Vazco.setErrorMessage is missing (You can override this logic by replacing UniCollection._showError)
// */
//UniCollection.prototype.addErrorSupportToRemoves = function (onErrorFn) {
//    if (Meteor.isServer) {
//        console.log('Default of error support for ' + this._name + ' cannot be applied on server side');
//        return;
//    }
//    var _remove = this.remove;
//    var collection = this;
//    if (!_.isFunction(onErrorFn)) {
//        onErrorFn = UniCollection._showError;
//    }
//    this.remove = function () {
//        var self = this;
//        var params = _.toArray(arguments);
//        var ind = params.length - 1;
//        if (ind > 0) {
//            var fn = params[ind];
//            var callback = function () {
//                if (arguments.length && arguments[0]) {
//                    console.error(
//                        collection._name + ' - remove: ' + arguments[0].reason || arguments[0].message,
//                        '- arguments: ', params
//                    );
//                    onErrorFn(arguments[0]);
//                }
//                if (_.isFunction(fn)) {
//                    fn.apply(self, arguments);
//                }
//            };
//            if (_.isFunction(fn)) {
//                params[ind] = callback;
//            } else {
//                params.push(callback);
//            }
//
//        }
//        return _remove.apply(self, params);
//    };
//};

///**
// * Adds error support for all upserts on client side, even if callback for update wasn't provided.
// * When update is unsuccessful function 'onErrorFn' will be called
// * @param {function=} onErrorFn (optional) If is not passed then Vazco.setErrorMessage for 'header' place will be called
// * or alert if Vazco.setErrorMessage is missing
// */
//UniCollection.prototype.addErrorSupportToUpserts = function (onErrorFn) {
//    if (Meteor.isServer) {
//        console.log('Default of error support for ' + this._name + ' cannot be applied on server side');
//        return;
//    }
//    var _upsert = this.upsert;
//    var collection = this;
//    if (!_.isFunction(onErrorFn)) {
//        onErrorFn = UniCollection._showError;
//    }
//    this.upsert = function () {
//        var self = this;
//        var params = _.toArray(arguments);
//        var ind = params.length - 1;
//        if (ind > 0) {
//            var fn = params[ind];
//            var callback = function () {
//                if (arguments.length && arguments[0]) {
//                    console.error(
//                        collection._name + ' - upsert: ' + arguments[0].reason || arguments[0].message,
//                        '- arguments: ', params
//                    );
//                    onErrorFn(arguments[0]);
//                }
//                if (_.isFunction(fn)) {
//                    fn.apply(self, arguments);
//                }
//            };
//            if (_.isFunction(fn)) {
//                params[ind] = callback;
//            } else {
//                params.push(callback);
//            }
//
//        }
//        return _upsert.apply(self, params);
//    };
//};
///**
// * Adds error callback to each one write methods
// * @see UniCollection.prototype.addErrorSupportToInserts
// * @see UniCollection.prototype.addErrorSupportToUpdates
// * @see UniCollection.prototype.addErrorSupportToUpserts
// * @see UniCollection.prototype.addErrorSupportToRemoves
// * @param {function=} onErrorFn If is not passed then Vazco.setErrorMessage for 'header' place will be called
// * or alert if Vazco.setErrorMessage is missing
// */
//UniCollection.prototype.addErrorSupportToAllWriteMethods = function (onErrorFn) {
//    if (Meteor.isServer) {
//        console.log('Default of error support for ' + this._name + ' cannot be applied on server side');
//        return;
//    }
//    this.addErrorSupportToInserts(onErrorFn);
//    this.addErrorSupportToUpserts(onErrorFn);
//    this.addErrorSupportToUpdates(onErrorFn);
//    this.addErrorSupportToRemoves(onErrorFn);
//};