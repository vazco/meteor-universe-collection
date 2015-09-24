'use strict';
/**
 * PublishAccessMixin adds access control to UniCollection.publish
 * This works like insert or update, to collection.allow and collection.deny will be added new validator named "publish"
 *
 * @example:
 * collection.allow({
 *      publish: function(userId, doc, publicationName){
 *          return true;
 *      }
 * });
 *
 * collection.deny({
 *      publish: function(userId, doc, publicationName){
 *          return doc.ownerId !== userId;
 *      }
 * });
 * @params
 * {string} userId The user 'userId' wants to subscribe document 'doc' from this collection.
 * {object} doc document that might be published
 * {string} publicationName name of publication if is available.
 *
 * Return true if this should be allowed.
 * WARNING: This rule will be respected only by 'UniCollection.publish',
 * Meteor.publish is expected to do their own access to checking instead relying on allow and deny.
 */
class PublishAccessMixin extends UniCollection.AbstractMixin {

    constructor() {
        super('PublishAccessMixin');
    }

    mount(collection) {
        collection.addNewAllowDenyValidatorType('publish');

        collection._uniPublishAddedHandler = PublishAccessMixin._uniPublishAddedHandler.bind(collection);
        collection._uniPublishChangedHandler = PublishAccessMixin._uniPublishChangedHandler.bind(collection);
        collection._uniPublishRemovedHandler = PublishAccessMixin._uniPublishRemovedHandler.bind(collection);

    }

    static _uniPublishAddedHandler (publishCtx, collectionName, id, doc){
        if (this.validateUniverseRule('publish', publishCtx.userId, doc, publishCtx._name)) {
            publishCtx._uniDocCounts[collectionName][id]++;
            publishCtx._directAdded(collectionName, id, doc);
            publishCtx._doMapping(id, doc, collectionName);
            return true;
        }
    }

    static _uniPublishChangedHandler (publishCtx, collectionName, id, changedFields, allowedFields){
        var hasOldDoc = UniUtils.get(publishCtx, '_documents.' + collectionName + '.' + id);
        var doc = this.findOne(id, {fields: allowedFields || undefined});
        var newAccess = this.validateUniverseRule('publish', publishCtx.userId, doc, publishCtx._name);
        if (!hasOldDoc && !newAccess) {
            //ignoring missed with no rights
            return;
        }
        //if we lost access
        if (hasOldDoc && !newAccess) {
            return collection._uniPublishRemovedHandler(publishCtx, collectionName, id);
        }
        //if we gained access, quickly adds doc
        if (!hasOldDoc && newAccess) {
            return collection._uniPublishAddedHandler(publishCtx, collectionName, id, doc);
        }
        //adding changes
        publishCtx._directChanged(collectionName, id, changedFields);
        publishCtx._doMapping(id, doc, collectionName);
        return true;
    }

    static _uniPublishRemovedHandler (publishCtx, collectionName, id){
        if (!publishCtx._uniDocCounts[collectionName] || publishCtx._uniDocCounts[collectionName][id] <= 0) {
            return;
        }
        --publishCtx._uniDocCounts[collectionName][id];
        if (!publishCtx._uniDocCounts[collectionName][id]) {
            delete publishCtx._uniDocCounts[collectionName][id];
            publishCtx._stopObserveHandlesAndCleanUp(collectionName, id);
            return publishCtx._directRemoved(collectionName, id);
        }
    };
}

UniCollection.mixins.PublishAccessMixin = PublishAccessMixin;
