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
     * Adds error callback to one of write methods like {insert, update, upsert, remove}
     * @param {string} fnName
     * @param {UniCollection} collection
     * @param {function=} onErrorFn
     */
    _addErrorSupport(fnName, collection, onErrorFn) {
        collection.onBeforeCall(fnName, 'ShowError', function (...args) {
            let cb = this.getCallback();
            this.setCallback(function (err) {
                if (err) {
                    onErrorFn(err);
                }
                if (cb) {
                    return cb.call(this, arguments);
                }
            });
        });
    }
}

UniCollection.mixins.ShowErrorMixin = ShowErrorMixin;
