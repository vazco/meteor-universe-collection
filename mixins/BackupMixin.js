'use strict';

class BackupMixin extends UniCollection.AbstractMixin {
    constructor ({
        backupOnRemove  = true,
        removeOnRestore = true,
        updateOnRestore = false
    } = {}) {
        super();

        this.backupOnRemove  = backupOnRemove;
        this.removeOnRestore = removeOnRestore;
        this.updateOnRestore = updateOnRestore;
    }

    mount (collection) {
        collection.backupCollection = new UniCollection(collection.getCollectionName() + 'Backup');

        collection.backup = this.backup.bind(this, collection);
        collection.restore = this.restore.bind(this, collection);

        if (this.backupOnRemove) {
            collection.onBeforeCall('remove', 'backup', collection.backup);
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
