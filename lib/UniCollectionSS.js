'use strict';
import {isObject} from './utils';

// Extend the schema options allowed by SimpleSchema
SimpleSchema.extendOptions({
    uniUI: Match.Optional(Object),
    autoform: Match.Optional(Object)
});

// Define some extra validation error messages
SimpleSchema.messages({
    insertNotAllowed: '[label] cannot be set during an insert',
    updateNotAllowed: '[label] cannot be set during an update'
});

export default UniCollection => {

    /*
     * Public API
     */

    /**
     * UniCollection.prototype.setSchema
     * @param {String|SimpleSchema|Object} name of schema (for multi schemas) or just SimpleSchema if this is default schema
     * @param {SimpleSchema|Object} ss - SimpleSchema instance or a schema definition object from which to create a new SimpleSchema instance
     * @param {Object} [options] options
     * @param {Boolean} [options.transform=false] Set to `true` if your document must be passed through the collection's transform to properly validate.
     * @param {Boolean} [options.replace=false] Set to `true` to replace any existing schema instead of combining
     * @return {undefined}
     *
     * Use this method to attach a schema to a collection created by another package,
     * such as Meteor.users. It is most likely unsafe to call this method more than
     * once for a single collection, or to call this for a collection that had a
     * schema object passed to its constructor.
     */
    UniCollection.prototype.setSchema = function uniAttachSchema (name, ss = undefined, options = undefined) {
        var self = this;
        options = options || {};

        if (isObject(name)) {
            if (ss) {
                options = ss;
            }
            ss = name;
            name = 'default';
        }

        if (!(ss instanceof SimpleSchema)) {
            ss = new SimpleSchema(ss);
        }

        self._schemas = self._schemas || {};

        // If we've already attached one schema, we combine both into a new schema unless options.replace is `true`
        if (self._schemas[name] && options.replace !== true) {
            ss = new SimpleSchema([self._schemas[name], ss]);
        }
        // Track the schema in the collection
        self._schemas[name] = ss;

        defineDeny(self, options);
        keepInsecure(self);
        //Compatibility with AutoForm
        if (name === 'default') {
            self.simpleSchema = function () {
                return self.getSchema();
            };
        }
    };

    /**
     * Gets schema for name or master schema if no name
     * @param {String=} name name of schema or nothing for default schema
     * @returns {SimpleSchema|null} Instance of SimpleSchema or null
     */
    UniCollection.prototype.getSchema = function getSchema (name) {
        name = name || 'default';
        var self = this;
        return UniUtils.get(self, '_schemas.' + name, null);
    };

    const _defineMutationMethods = UniCollection.prototype._defineMutationMethods;
    UniCollection.prototype._defineMutationMethods = function (...p) {
        this._areDefinedMutationMethods = true;
        return _defineMutationMethods.call(this, ...p);
    };

// Wrap DB write operation methods
    ['insert', 'update', 'upsert'].forEach(methodName => {
        var _super = UniCollection.prototype[methodName];
        UniCollection.prototype[methodName] = function () {
            var self = this, userId,
                args = _.toArray(arguments);
            if (self._schemas) {
                userId = UniUsers.getLoggedInId() || null;
                args = doValidate.call(self, methodName, args, false, userId, Meteor.isServer);
                if (!args) {
                    // doValidate already called the callback or threw the error
                    if (methodName === 'insert') {
                        // insert should always return an ID to match core behavior
                        return self._makeNewID();
                    }
                    return;
                }
            }
            return _super.apply(self, args);
        };
    });


    /*
     * Private
     */

    function doValidate (type, args, skipAutoValue, userId, isFromTrustedCode) {
        /*eslint complexity:0*/
        var self = this, schema, doc, callback, error, options, isUpsert, selector, last, hasCallback, schemaName,
            isLocalCollection = (self._connection === null);

        if (!args.length) {
            throw new Error(type + ' requires an argument');
        }

        // Gather arguments and cache the selector
        if (type === 'insert') {
            doc = args[0];
            options = args[1];
            callback = args[2];
        } else if (type === 'update' || type === 'upsert') {
            selector = args[0];
            doc = args[1];
            options = args[2];
            callback = args[3];
        } else {
            throw new Error('invalid type argument');
        }

        // Support missing options arg
        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }
        options = options || {};
        last = args.length - 1;

        hasCallback = (typeof args[last] === 'function');

        // If update was called with upsert:true or upsert was called, flag as an upsert
        isUpsert = (type === 'upsert' || (type === 'update' && options.upsert === true));

        schemaName = options.useSchema || 'default';
        schema = self._schemas[schemaName];

        if (!schema) {
            throw new Error('Missing such schema for name: "' + schemaName + '"');
        }

        // Add a default callback function if we're on the client and no callback was given
        if (Meteor.isClient && !callback) {
            // Client can't block, so it can't report errors by exception,
            // only by callback. If they forget the callback, give them a
            // default one that logs the error, so they aren't totally
            // baffled if their writes don't work because their database is
            // down.
            callback = function (err) {
                if (err) {
                    Meteor._debug(
                        type + ' failed for collection "' + self.getCollectionName() + '" with schema "' + schemaName + '":'
                        + (err.reason || err.stack)
                    );
                }
            };
        }

        // If client validation is fine or is skipped but then something
        // is found to be invalid on the server, we get that error back
        // as a special Meteor.Error that we need to parse.
        if (Meteor.isClient && hasCallback) {
            callback = args[last] = wrapCallbackForParsingServerErrors(self, options.validationContext, schemaName, callback);
        }

        // If _id has already been added, remove it temporarily if it's
        // not explicitly defined in the schema.
        var id;
        if (doc._id && !schema.allowsKey('_id')) {
            id = doc._id;
            delete doc._id;
        }

        function doClean (docToClean, getAutoValues, filter, autoConvert, removeEmptyStrings, trimStrings) {
            // Clean the doc/modifier in place
            schema.clean(docToClean, {
                filter: filter,
                autoConvert: autoConvert,
                getAutoValues: getAutoValues,
                isModifier: (type !== 'insert'),
                removeEmptyStrings: removeEmptyStrings,
                trimStrings: trimStrings,
                extendAutoValueContext: _.extend({
                    isInsert: (type === 'insert'),
                    isUpdate: (type === 'update' && options.upsert !== true),
                    isUpsert: isUpsert,
                    userId: userId,
                    isFromTrustedCode: isFromTrustedCode,
                    docId: ((type === 'update' || type === 'upsert') && selector) ? selector._id || selector : undefined,
                    isLocalCollection: isLocalCollection
                }, options.extendAutoValueContext || {})
            });
        }

        // On the server and for local collections, we allow passing `getAutoValues: false` to disable autoValue functions
        if ((Meteor.isServer || isLocalCollection) && options.getAutoValues === false) {
            skipAutoValue = true;
        }

        // Preliminary cleaning on both client and server. On the server and for local
        // collections, automatic values will also be set at this point.
        doClean(doc, ((Meteor.isServer || isLocalCollection) && !skipAutoValue), options.filter !== false, options.autoConvert !== false, options.removeEmptyStrings !== false, options.trimStrings !== false);

        // We clone before validating because in some cases we need to adjust the
        // object a bit before validating it. If we adjusted `doc` itself, our
        // changes would persist into the database.
        var docToValidate = {};
        for (let prop in doc) {
            // We omit prototype properties when cloning because they will not be valid
            // and mongo omits them when saving to the database anyway.
            if (doc.hasOwnProperty(prop)) {
                docToValidate[prop] = doc[prop];
            }
        }

        // On the server, upserts are possible; SimpleSchema handles upserts pretty
        // well by default, but it will not know about the fields in the selector,
        // which are also stored in the database if an insert is performed. So we
        // will allow these fields to be considered for validation by adding them
        // to the $set in the modifier. This is no doubt prone to errors, but there
        // probably isn't any better way right now.
        if (Meteor.isServer && isUpsert && isObject(selector)) {
            let set = docToValidate.$set || {};
            docToValidate.$set = _.clone(selector);
            _.extend(docToValidate.$set, set);
        }

        // Set automatic values for validation on the client.
        // On the server, we already updated doc with auto values, but on the client,
        // we will add them to docToValidate for validation purposes only.
        // This is because we want all actual values generated on the server.
        if (Meteor.isClient && !isLocalCollection) {
            doClean(docToValidate, true, false, false, false, false);
        }

        // Validate doc
        var ctx = schema.namedContext(options.validationContext);
        var isValid;
        if (options.validate === false) {
            isValid = true;
        } else {
            isValid = ctx.validate(docToValidate, {
                modifier: (type === 'update' || type === 'upsert'),
                upsert: isUpsert,
                extendedCustomContext: _.extend({
                    isInsert: (type === 'insert'),
                    isUpdate: (type === 'update' && options.upsert !== true),
                    isUpsert: isUpsert,
                    userId: userId,
                    isFromTrustedCode: isFromTrustedCode,
                    docId: ((type === 'update' || type === 'upsert') && selector) ? selector._id || selector : undefined,
                    isLocalCollection: isLocalCollection
                }, options.extendedCustomContext || {})
            });
        }

        if (isValid) {
            // Add the ID back
            if (id) {
                doc._id = id;
            }

            // Update the args to reflect the cleaned doc
            if (type === 'insert') {
                args[0] = doc;
            } else {
                args[1] = doc;
            }

            // If callback, set invalidKey when we get a mongo unique error
            if (Meteor.isServer && hasCallback) {
                args[last] = wrapCallbackForParsingMongoValidationErrors(self, doc, options.validationContext, schemaName, args[last]);
            }

            return args;
        }

        error = getErrorObject(ctx);
        if (callback) {
            // insert/update/upsert pass `false` when there's an error, so we do that
            callback(error, false);
        } else {
            throw error;
        }
    }

    function getErrorObject (context) {
        var message, invalidKeys = context.invalidKeys();
        if (invalidKeys.length) {
            message = context.keyErrorMessage(invalidKeys[0].name);
        } else {
            message = 'Failed validation';
        }
        var error = new Error(message);
        error.invalidKeys = invalidKeys;
        error.validationContext = context;
        // If on the server, we add a sanitized error, too, in case we're
        // called from a method.
        if (Meteor.isServer) {
            error.sanitizedError = new Meteor.Error(400, message);
        }
        return error;
    }


    function wrapCallbackForParsingMongoValidationErrors (col, doc, vCtx, schemaName, cb) {
        return function wrappedCallbackForParsingMongoValidationErrors (error) {
            var context;
            if (error && ((error.name === 'MongoError' && error.code === 11001) || error.message.indexOf('MongoError: E11000' !== -1)) && error.message.indexOf('c2_') !== -1) {
                context = col.getSchema(schemaName).namedContext(vCtx);
                arguments[0] = getErrorObject(context);
            }
            return cb.apply(this, arguments);
        };
    }

    function wrapCallbackForParsingServerErrors (col, vCtx, schemaName, cb) {
        return function wrappedCallbackForParsingServerErrors (error) {
            // Handle our own validation errors
            var context = col.getSchema(schemaName).namedContext(vCtx);
            if (error instanceof Meteor.Error && error.error === 400 && error.reason === 'INVALID' && typeof error.details === 'string') {
                let invalidKeysFromServer = EJSON.parse(error.details);
                context.addInvalidKeys(invalidKeysFromServer);
                arguments[0] = getErrorObject(context);
                // Handle Mongo unique index errors, which are forwarded to the client as 409 errors
            } else if (error instanceof Meteor.Error && error.error === 409 && error.reason && error.reason.indexOf('E11000') !== -1 && error.reason.indexOf('c2_') !== -1) {
                arguments[0] = getErrorObject(context);
            }
            return cb.apply(this, arguments);
        };
    }

//Small hack for fixing of arguments in insert method
// (To provide options on server side we must allow to pass them on insert method)
    if (Meteor.isClient) {
        let ins = LocalCollection.prototype.insert;
        LocalCollection.prototype.insert = function () {
            var args = _.toArray(arguments);
            if (args.length && typeof args[args.length - 1] === 'function') {
                return ins.call(this, args[0], args[args.length - 1]);
            }
            return ins.call(this, args[0]);
        };
    }

    var alreadyInsecured = {};
    function keepInsecure (c) {
        // If insecure package is in use, we need to add allow rules that return
        // true. Otherwise, it would seemingly turn off insecure mode.
        if (Package && Package.insecure && !alreadyInsecured[c._name]) {
            c.allow({
                insert: function () {
                    return true;
                },
                update: function () {
                    return true;
                },
                remove: function () {
                    return true;
                },
                fetch: [],
                transform: null
            });
            alreadyInsecured[c._name] = true;
        }
        // If insecure package is NOT in use, then adding the two deny functions
        // does not have any effect on the main app's security paradigm. The
        // user will still be required to add at least one allow function of her
        // own for each operation for this collection. And the user may still add
        // additional deny functions, but does not have to.
    }

    var alreadyDefined = {};
    function defineDeny (c, options) {
        var isLocalCollection;
        if (Meteor.isServer && !alreadyDefined[c.getCollectionName()] && c._areDefinedMutationMethods) {
            isLocalCollection = (c._connection === null);
            // First define deny functions to extend doc with the results of clean
            // and autovalues. This must be done with "transform: null" or we would be
            // extending a clone of doc and therefore have no effect.
            c.deny({
                insert: function (userId, doc) {
                    var options = c._getContextOptions() || {};
                    var ss = c.getSchema(options.useSchema);
                    // If _id has already been added, remove it temporarily if it's
                    // not explicitly defined in the schema.
                    var id;
                    if (Meteor.isServer && doc._id && !ss.allowsKey('_id')) {
                        id = doc._id;
                        delete doc._id;
                    }

                    // Referenced doc is cleaned in place
                    ss.clean(doc, {
                        isModifier: false,
                        // We don't do these here because they are done on the client if desired
                        filter: false,
                        autoConvert: false,
                        removeEmptyStrings: false,
                        trimStrings: false,
                        extendAutoValueContext: {
                            isInsert: true,
                            isUpdate: false,
                            isUpsert: false,
                            userId: userId,
                            isFromTrustedCode: false,
                            docId: id,
                            isLocalCollection: isLocalCollection
                        }
                    });

                    // Add the ID back
                    if (id) {
                        doc._id = id;
                    }

                    return false;
                },
                update: function (userId, doc, fields, modifier) {
                    var options = c._getContextOptions() || {};
                    var ss = c.getSchema(options.useSchema);
                    // Referenced modifier is cleaned in place
                    ss.clean(modifier, {
                        isModifier: true,
                        // We don't do these here because they are done on the client if desired
                        filter: false,
                        autoConvert: false,
                        removeEmptyStrings: false,
                        trimStrings: false,
                        extendAutoValueContext: {
                            isInsert: false,
                            isUpdate: true,
                            isUpsert: false,
                            userId: userId,
                            isFromTrustedCode: false,
                            docId: doc && doc._id,
                            isLocalCollection: isLocalCollection
                        }
                    });

                    return false;
                },
                fetch: ['_id'],
                transform: null
            });

            // Second define deny functions to validate again on the server
            // for client-initiated inserts and updates. These should be
            // called after the clean/autovalue functions since we're adding
            // them after. These must *not* have 'transform: null' if options.transform is true because
            // we need to pass the doc through any transforms to be sure
            // that custom types are properly recognized for type validation.
            c.deny(_.extend({
                insert: function (userId, doc) {
                    // We pass the false options because we will have done them on client if desired
                    var options = c._getContextOptions() || {};
                    doValidate.call(c, 'insert', [doc, {
                        trimStrings: false,
                        removeEmptyStrings: false,
                        filter: false,
                        autoConvert: false,
                        useSchema: options.useSchema || 'default'
                    }, function (error) {
                        if (error) {
                            throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));
                        }
                    }], true, userId, false);

                    return false;
                },
                update: function (userId, doc, fields, modifier) {
                    var options = c._getContextOptions() || {};
                    // NOTE: This will never be an upsert because client-side upserts
                    // are not allowed once you define allow/deny functions.
                    // We pass the false options because we will have done them on client if desired
                    doValidate.call(c, 'update', [{_id: doc && doc._id}, modifier, {
                        trimStrings: false,
                        removeEmptyStrings: false,
                        filter: false,
                        autoConvert: false,
                        useSchema: options.useSchema || 'default'
                    }, function (error) {
                        if (error) {
                            throw new Meteor.Error(400, 'INVALID', EJSON.stringify(error.invalidKeys));
                        }
                    }], true, userId, false);

                    return false;
                },
                fetch: ['_id']
            }, options.transform === true ? {} : {transform: null}));

            // note that we've already done this collection so that we don't do it again
            // if attachSchema is called again
            alreadyDefined[c._name] = true;
        }
    }

};
