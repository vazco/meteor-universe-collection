'use strict';

class BackupMixin extends UniCollection.AbstractMixin {
    constructor ({
        backupOnRemove  = true,
        removeOnRestore = true,
        updateOnRestore = false
    } = {}) {
        super('BackupMixin');

        this.backupOnRemove  = backupOnRemove;
        this.removeOnRestore = removeOnRestore;
        this.updateOnRestore = updateOnRestore;
    }

    mount (collection) {
        collection.backupCollection = new UniCollection(collection.getCollectionName() + 'Backup');
        collection.backupCollection.create = collection.create.bind(collection);
        collection.backupCollection._validators = collection._validators;
        collection.backupCollection._universeValidators = collection._universeValidators;

        collection.methods({
            backup: this.backup.bind(this, collection),
            restore: this.restore.bind(this, collection)
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
            collection.backupCollection.upsert(document._id, document.toJSONValue());
        });
    }

    restore (collection, selector = {}, {
        removeOnRestore = this.removeOnRestore,
        updateOnRestore = this.updateOnRestore
    } = {}) {
        collection.backupCollection.find(selector).forEach(document => {
            if (updateOnRestore) {
                collection.upsert(document._id, document.toJSONValue());
            } else {
                collection.insert(document.toJSONValue());
            }

            if (removeOnRestore) {
                document.remove();
            }
        });
    }
}

UniCollection.mixins.BackupMixin = BackupMixin;
