'use strict';

class BackupMixin extends UniCollection.AbstractMixin {
    constructor ({
        expireAfter = false,

        name = 'Backup',
        backupOnRemove  = true,
        removeOnRestore = true,
        upsertOnRestore = false
    } = {}) {
        super(name);

        this.expireAfter = expireAfter;

        this.backupOnRemove  = backupOnRemove;
        this.removeOnRestore = removeOnRestore;
        this.upsertOnRestore = upsertOnRestore;
    }

    mount (collection) {
        collection.backupCollection = new UniCollection(collection.getCollectionName() + 'Backup');
        collection.backupCollection.create = collection.create.bind(collection);
        collection.backupCollection._validators = collection._validators;
        collection.backupCollection._universeValidators = collection._universeValidators;

        if (Meteor.isServer && this.expireAfter) {
            collection.backupCollection._ensureIndex({
                _backupAt: 1
            }, {
                expireAfterSeconds: this.expireAfter
            });
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
                collection.call('backup', this._id);
            },

            restore: function (options = {}) {
                collection.call('restore', this._id, options);
            }
        });

        collection.backup = (selector = {}) => {
            collection.call('backup', selector);
        };

        collection.restore = (selector = {}, options = {}) => {
            collection.call('restore', selector, options);
        };

        collection.onBeforeCall('remove', 'backup', (...args) => this.softRemove(collection, ...args));
    }

    backup (collection, selector = {}) {
        collection.find(selector).forEach((document) => {
            let jValue = document.toJSONValue();
            collection.backupCollection.upsert(document._id, {
                ...jValue,
                _backupAt: new Date()
            });
        });
    }

    restore (collection, selector = {}, {
        removeOnRestore = this.removeOnRestore,
        upsertOnRestore = this.upsertOnRestore
    } = {}) {
        collection.backupCollection.find(selector).forEach(document => {
            var object = document.toJSONValue();
            delete object._backupAt;

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

    softRemove (collection, id) {
        if (this.backupOnRemove) {
            collection.backup(id);
        }
    }
}

UniCollection.mixins.BackupMixin = BackupMixin;
