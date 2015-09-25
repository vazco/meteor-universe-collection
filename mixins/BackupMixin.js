'use strict';
/**
 * BackupMixin adds backup to collection
 *
 * @example:
 * collection = new UniCollection('collection', {
 *     mixins: [
 *         new UniCollection.mixins.BackupMixin({
 *             name: 'Backup', // backup collecton suffix,
 *             expireAfter: false, // expire time of backup in seconds
 *
 *             backupOnRemove:  true, // if true, creates backup on remove
 *             removeOnRestore: true, // if true, removes backup on restore
 *             upsertOnRestore: false // if true, upserts backup on restore, inserts otherwise
 *         })
 *     ]
 * });
 *
 * collection.insert({number: 1});
 * collection.insert({number: 2});
 * collection.insert({number: 3});
 *
 * collection.find().count(); // 3
 * collection.remove();       // all documents are copied to collection.backupCollection
 * collection.find().count(); // 0
 * collection.restore();      // all documents are copied to collection
 * collection.find().count(); // 3
 */
class BackupMixin extends UniCollection.AbstractMixin {
    constructor ({
        name = 'Backup',
        expireAfter = false,

        backupOnRemove  = true,
        removeOnRestore = true,
        upsertOnRestore = false
    } = {}) {
        super(name);

        this.name = name;
        this.expireAfter = expireAfter;

        this.backupOnRemove  = backupOnRemove;
        this.removeOnRestore = removeOnRestore;
        this.upsertOnRestore = upsertOnRestore;
    }

    mount (collection) {
        collection.backupCollection = new UniCollection(collection.getCollectionName() + this.name);
        collection.backupCollection.create = collection.create.bind(collection);
        collection.backupCollection._validators = collection._validators;
        collection.backupCollection._universeValidators = collection._universeValidators;

        if (Meteor.isServer) {
            if (this.expireAfter) {
                collection.backupCollection.ensureMongoIndex('backup', {
                    _backupDate: true
                }, {
                    expireAfterSeconds: this.expireAfter
                });
            } else {
                collection.backupCollection._dropIndex({
                    _backupDate: true
                });
            }
        }

        collection.methods({
            backup: (...args) => {
                this.backup(collection, ...args);
            },

            restore: (...args) => {
                this.restore(collection, ...args);
            }
        });

        collection.docHelpers({
            backup: function () {
                collection.backup(this._id);
            },

            restore: function (options = {}) {
                collection.restore(this._id, options);
            }
        });

        collection.backup = (selector = {}) => {
            collection.call('backup', selector);
        };

        collection.restore = (selector = {}, options = {}) => {
            collection.call('restore', selector, options);
        };

        collection.onBeforeCall('remove', 'backup', (id) => {
            if (this.backupOnRemove) {
                collection.backup(id);
            }
        });
    }

    backup (collection, selector = {}) {
        collection.find(selector).forEach((document) => {
            const object = document.toJSONValue();

            collection.backupCollection.upsert(document._id, {
                ...object,
                _backupDate: new Date()
            });
        });
    }

    restore (collection, selector = {}, {
        removeOnRestore = this.removeOnRestore,
        upsertOnRestore = this.upsertOnRestore
    } = {}) {
        collection.backupCollection.find(selector, {
            fields: {
                _backupDate: false
            }
        }).forEach((document) => {
            var object = document.toJSONValue();

            if (upsertOnRestore) {
                collection.upsert(object._id, object);
            } else {
                collection.insert(object);
            }

            if (removeOnRestore) {
                document.remove();
            }
        });
    }
}

UniCollection.mixins.BackupMixin = BackupMixin;
