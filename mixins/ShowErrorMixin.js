'use strict';
import {isObject} from '../lib/utils';

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
    constructor({name = 'ShowError', ...params} = {}) {
        super(name);
        this.params = params;
    }

    mount(collection) {
        if (Meteor.isClient) {
            const params = this.params;
            params.errorDisplayer = (params.errorDisplayer || this._showError).bind(collection);

            if (params.addForMethods) {
                Object.keys(params.addForMethods).forEach((fnName)=> {
                    let fn = params.addForMethods[fnName];
                    if (fn) {
                        this._addErrorSupport(fnName, collection,typeof fn === 'function' ? fn : params.errorDisplayer);
                    }
                });
                return;
            }
            ['insert', 'update', 'upsert', 'remove'].forEach((fnName) => {
                this._addErrorSupport(fnName, collection, params.errorDisplayer);
            });
        }
    }

    _showError(text) {
        if (isObject(text)) {
            text = text.reason || text.message;
        }
        if (typeof UniUI === 'object' && UniUI.setErrorMessage) {
            UniUI.setErrorMessage('header', text);
        } else {
            alert(text);
        }
    }

    /**
     * Adds error callback to one of write methods like {insert, update, upsert, remove}
     * @param {string} fnName
     * @param {UniCollection} collection
     * @param {function=} onErrorFn
     */
    _addErrorSupport(fnName, collection, onErrorFn) {
        collection.onBeforeCall(fnName, 'ShowError', function () {
            let cb = this.getCallback();
            this.setCallback(function (err) {
                if (err) {
                    onErrorFn(err);
                }
                if (cb) {
                    return cb.apply(this, arguments);
                }
            });
        });
    }
}

UniCollection.mixins.ShowErrorMixin = ShowErrorMixin;
