'use strict';

class BackupMixin extends UniCollection.AbstractMixin {
    constructor ({
        expireAfter = false,

        name = 'Backup',
        backupOnRemove  = true,
        removeOnRestore = true,
        updateOnRestore = false
    } = {}) {
        super(name);

        this.expireAfter = expireAfter;

        this.backupOnRemove  = backupOnRemove;
        this.removeOnRestore = removeOnRestore;
        this.updateOnRestore = updateOnRestore;
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

        if (this.backupOnRemove) {
            collection.onBeforeCall('remove', 'backup', id => collection.backup(id));
        }
    }

    backup (collection, selector = {}) {
        collection.find(selector).forEach(document => {
            collection.backupCollection.upsert(document._id, {
                ...document.toJSONValue(),
                _backupAt: new Date()
            });
        });
    }

    restore (collection, selector = {}, {
        removeOnRestore = this.removeOnRestore,
        updateOnRestore = this.updateOnRestore
    } = {}) {
        collection.backupCollection.find(selector).forEach(document => {
            const object = document.toJSONValue();
            delete object._backupAt;

            if (updateOnRestore) {
                collection.upsert(document._id, object);
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
