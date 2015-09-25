'use strict';
/**
 * Creates an index on the specified field if the index does not already exist.
 * If universe detects,that index under name is changed,
 * mechanism will drop the old index under name passed as first parameter to this function.
 * @param {string} indexName Unique name of index for this collection
 * @param {object} keys An Object that contains the field and value pairs where the field is the index key
 * and the value describes the type of index for that field.
 * For an ascending index on a field, specify a value of 1; for descending index, specify a value of -1.
 * @param {object} options Optional. A document that contains a set of options that controls the creation of the index.
 */
UniCollection.prototype.ensureMongoIndex = function (indexName, keys, options = {}){
    check(indexName, String);
    var value = JSON.stringify([keys, options]);
    var indexes = UniConfig.private.get(this.getCollectionName()+'_indexes') || {};
    if (indexes[indexName] && indexes[indexName] !== value){
        this._dropIndex(indexName);
    }
    options['name'] = indexName;
    indexes[indexName] = value;
    UniConfig.private.set(this.getCollectionName()+'_indexes', indexes);
    this._ensureIndex(keys, options);
};