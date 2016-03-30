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
                collection.backupCollection.ensureMongoIndex('_backupDate', {
                    _backupDate: true
                }, {
                    expireAfterSeconds: this.expireAfter
                });
            } else {
                collection.backupCollection.dropMongoIndex('_backupDate');
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

        if (Meteor.isServer) {
            const remove = collection._collection.remove;
            const self = this;
            collection._collection.remove = function () {
                if (self.backupOnRemove) {
                    const args = arguments;
                    UniCollection._lastMethod.withValue('remove', function () {
                        collection.backup.apply(self, args);
                    });
                }
                return remove.apply(self, arguments);
            };
        }
    }

    backup (collection, selector = {}) {
        collection.find(selector, {transform: null}).forEach(document => {

            collection.backupCollection.upsert(document._id, {
                ...document,
                _backupDate: new Date()
            }, {validate: false});
        });
    }

    restore (collection, selector = {}, {
        removeOnRestore = this.removeOnRestore,
        upsertOnRestore = this.upsertOnRestore
    } = {}) {
        if (Meteor.isClient) {
            return true;
        }

        const rawCollection = collection.rawCollection();
        const insert = Meteor.wrapAsync(rawCollection.insert, rawCollection);
        const update = Meteor.wrapAsync(rawCollection.update, rawCollection);
        collection.backupCollection.find(selector, {
            fields: {
                _backupDate: false
            },
            transform: null
        }).forEach(document => {
            if (upsertOnRestore) {
                update({_id: document._id}, {$set: document}, {upsert: true});
            } else {
                insert(document);
            }

            if (removeOnRestore) {
                collection.backupCollection.remove({_id: document._id});
            }
        });
    }
}

UniCollection.mixins.BackupMixin = BackupMixin;
