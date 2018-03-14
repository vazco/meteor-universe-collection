import {isObject, isFunction, isString} from './utils';

export default UniCollection => {
    UniCollection._publications = {};
    /**
     * Publish with mappings, this is the replacement of Meteor.publish.
     * It works for non-universe collections in the same way like Meteor.publish
     *
     * @param name Name of the record set.
     * If null, the set has no name, and the record set is automatically sent to all connected clients
     * (if you use mixin "PublishAccessMixin" then with access control)
     * @param handler {Function} Function called on the server each time a client subscribes.
     * Inside the function, this is the publish handler object, described below.
     * If the client passed arguments to subscribe, the function is called with the same arguments.
     * @param options {Object}
     * @param options.override {boolean} resets handler for publication name. (only named publication can be overridden)
     * @param options.userOnly {boolean} publication will be available only for users
     * @param options.adminOnly {boolean} publication will be available only for admins
     * @returns {*}
     */
    UniCollection.publish = function (name, handler, options = {}) {
        if (!isFunction(handler)) {
            throw new Meteor.Error(404, 'UniCollection.publish: handler must be an function');
        }
        if (name) {
            let isAlreadyDefined = !!UniCollection._publications[name];
            if (isAlreadyDefined && (!options || !options.override)) {
                throw new Meteor.Error(403, 'Publication is already declared for name: "' + name + '", ' +
                    'if you want override it, set override: true in options');
            }
            UniCollection._publications[name] = {handler, options};
            if (isAlreadyDefined) {
                return;
            }
        }
        var newHandler = function () {
            let {handler, options} = UniCollection._publications[name];
            if (options.userOnly && !this.userId) {
                return this.ready();
            }
            if (options.adminOnly && !UniUsers.isAdminLoggedIn()) {
                return this.ready();
            }
            this._directAdded = this.added;
            this._directChanged = this.changed;
            this._directRemoved = this.removed;
            this._uniMappingsObs = {};
            this._uniDocCounts = {};
            this._uniMappings = {};

            this.added = addedHandler;
            this.changed = changedHandler;
            this.removed = removedHandler;

            this._doMapping = _doMapping.bind(this);
            this._stopObserveHandlesAndCleanUp = _stopObserveHandlesAndCleanUp.bind(this);

            this.setMappings = function (collectionName, mappings) {
                if (isObject(collectionName) && collectionName._name) {
                    collectionName = collectionName._name;
                }
                if (!Array.isArray(mappings) && isObject(mappings) && mappings.collection) {
                    mappings = [mappings];
                }
                if (!Array.isArray(mappings)) {
                    throw Meteor.Error(500, 'Parameter mappings must be an array of object');
                }
                if (!isString(collectionName)) {
                    throw Meteor.Error(500, 'CollectionName must be a string or collection object');
                }
                this._uniMappings[collectionName] = mappings;
            };
            var curs = handler.apply(this, arguments);
            if (curs) {
                _eachCursorsCheck.call(this, curs);
            }
        };

        Meteor.publish(name, newHandler);
    };

    var _prepareUniDocCount = function (collectionName, id) {
        this._uniDocCounts[collectionName] = this._uniDocCounts[collectionName] || {};
        this._uniDocCounts[collectionName][id] =
            this._uniDocCounts[collectionName][id] || 0;
    };

    var addedHandler = function (collectionName, id, doc) {
        _prepareUniDocCount.call(this, collectionName, id, doc);
        var col = UniCollection._uniCollections[collectionName];
        //checks if no universe collection
        if (this._uniDocCounts[collectionName][id]) {
            return;
        }
        if (!col || !col._uniPublishAddedHandler) {
            this._uniDocCounts[collectionName][id] = true;
            this._directAdded(collectionName, id, doc);
            this._doMapping(id, doc, collectionName);
            return true;
        }
        if (typeof col._uniPublishAddedHandler === 'function') {
            return col._uniPublishAddedHandler(this, collectionName, id, doc);
        }
    };

    var changedHandler = function (collectionName, id, changedFields, allowedFields) {
        var col = UniCollection._uniCollections[collectionName];
        //checks if no universe collection
        if (!col || !col._uniPublishChangedHandler) {
            this._directChanged(collectionName, id, changedFields);
            this._doMapping(id, changedFields, collectionName);
            return;
        }
        if (typeof col._uniPublishChangedHandler === 'function') {
            return col._uniPublishChangedHandler(this, collectionName, id, changedFields, allowedFields);
        }
    };

    var removedHandler = function (collectionName, id) {
        var col = UniCollection._uniCollections[collectionName];
        if (!col || !col._uniPublishRemovedHandler) {
            if (!this._uniDocCounts[collectionName] || !this._uniDocCounts[collectionName][id]) {
                return;
            }

            delete this._uniDocCounts[collectionName][id];

            const mappings = this._uniMappings[collectionName];
            if (mappings) {
                mappings.forEach(mapping => {
                    const key = mapping.reverse && '_reverse';
                    const withCollectionName = typeof mapping.collection !== 'string'
                        ? mapping.collection && mapping.collection._name
                        : mapping.collection;

                    _stopObserveHandlesAndCleanUp.call(this, collectionName, id, key, withCollectionName);
                });
            }

            return this._directRemoved(collectionName, id);
        }
        if (typeof col._uniPublishRemovedHandler === 'function') {
            return col._uniPublishRemovedHandler(this, collectionName, id);
        }
    };

    var _eachCursorsCheck = function (curs, _parentDocId) {
        if (!Array.isArray(curs)) {
            curs = [curs];
        }
        var sub = this;
        if (curs.length) {
            let handles = curs.map(cursor => {
                if (!isObject(cursor) || !cursor.observeChanges) {
                    throw Meteor.Error(500, 'Publish function can only return a Cursor or an array of Cursors');
                }
                var collName = cursor._getCollectionName();
                var obs = {docs: {}, name: collName};
                var allowedFields = UniUtils.get(cursor._cursorDescription, 'options.fields');
                obs.handle = cursor.observeChanges({
                    added  : function (id, fields) {
                        obs.docs[id] = true;
                        sub.added(collName, id, fields);
                    },
                    changed: function (id, fields) {
                        sub.changed(collName, id, fields, allowedFields);
                    },
                    removed: function (id) {
                        delete obs.docs[id];
                        sub.removed(collName, id);
                    }
                });
                return obs;
            });
            if (!_parentDocId) {
                sub.ready();
            }
            sub.onStop(function () {
                handles.forEach(h => {
                    h && h.handle && h.handle.stop();
                });
            });
            return handles;
        }
    };

    var _doMapping = function (id, doc, collectionName) {
        var mappings = this._uniMappings[collectionName];
        if (!mappings) {
            return;
        }
        var sub = this;
        var mapFilter;
        mappings.forEach(mapping => {
            mapFilter = {};
            if (mapping.reverse) {
                mapFilter[mapping.key] = id;
            } else {
                mapFilter._id = UniUtils.get(doc, mapping.key);
                if (!mapFilter._id) {
                    return;
                }
                if (Array.isArray(mapFilter._id)) {
                    if (!mapFilter._id.length) {
                        return;
                    }
                    mapFilter._id = {
                        $in: mapFilter._id
                    };
                }
            }
            _.extend(mapFilter, mapping.filter);
            var key = mapping.reverse && '_reverse';
            var withCollectionName = (typeof mapping.collection !== 'string'
                ? (mapping.collection && mapping.collection._name)
                : mapping.collection);
            //stopping and clearing up of observers
            _stopObserveHandlesAndCleanUp.call(sub, collectionName, id, key, withCollectionName);
            var handles = _eachCursorsCheck.call(sub, mapping.collection.find(mapFilter, mapping.options), id);
            //adding new observers
            handles && _saveObserveHandles.call(sub, collectionName, id, key, withCollectionName, handles[0]);
        });

    };

    var _saveObserveHandles = function (collectionName, id, key, withCollectionName, handles) {
        if (withCollectionName) {
            withCollectionName = '_' + withCollectionName;
        } else {
            withCollectionName = withCollectionName || '';
        }
        key = key + withCollectionName;
        UniUtils.set(this._uniMappingsObs, collectionName + '.' + id + '.' + key, handles);
    };

    /**
     * Stops subscriptions and removes old docs
     * @context sub
     * @param collectionName
     * @param id
     * @param key
     * @param withCollectionName
     * @private
     */

    var _stopObserveHandlesAndCleanUp = function (collectionName, id, key, withCollectionName) {
        var toStopping;
        var sub = this;
        if (withCollectionName) {
            withCollectionName = '_' + withCollectionName;
        } else {
            withCollectionName = withCollectionName || '';
        }
        key = key + withCollectionName;
        if (key) {
            toStopping = {'key': UniUtils.get(sub._uniMappingsObs, collectionName + '.' + id + '.' + key)};
        } else {
            toStopping = UniUtils.get(sub._uniMappingsObs, collectionName + '.' + id) || {};
        }
        toStopping.forEach(obs => {
            if (obs) {
                obs.handle && obs.handle.stop();
                obs.docs && Object.entries(obs.docs).forEach(([i, v]) => {
                    v && sub.removed(obs.name, i);
                });
                obs.docs = {};
            }
        });
    };
};
