'use strict';

/**
 * @deprecated please use setDocumentClass instead.
 */
UniCollection.prototype.setDocumentPrototype = UniCollection.prototype.setDocumentClass;
/**
 * @deprecated please use docHelpers instead.
 */
UniCollection.prototype.helpers = UniCollection.prototype.docHelpers;


var _availablePermissions = {};
/**
 * Add new permission type (Must be called on both sides)
 * You must add new permission typ on server and client side
 * On UniUser you will be have function: user.getPermission<PermissionName>
 * @example    for example moderator -> user.getPermissionModerator
 * @param permissionName
 * @param templateNameOfField If you use UniUI as a default will be loaded 'UniUsers_defaultPermissionField'
 * @deprecated
 */
UniUsers.setNewPermissionType = function (permissionName, templateNameOfField) {
    check(permissionName, String);

    if (Meteor.isServer) {
        templateNameOfField = true;
    }

    if (!UniUsers.defaultPermissionField && !templateNameOfField) {
        throw new Meteor.Error(404, 'Missing default permission field template name.' +
            ' please define it in "UniUsers.defaultPermissionField" or use UniUI package');
    }
    _availablePermissions[permissionName] = templateNameOfField || UniUsers.defaultPermissionField;

    var fnName = permissionName.charAt(0).toUpperCase() + permissionName.slice(1);
    UniUsers.UniUser.prototype['getPermission'+fnName] = function () {
        if (this.permissions) {
            return this.permissions[permissionName];
        }
        return false;
    };
};

UniUsers.defaultPermissionField = null;

/**
 * Gets all registered permissions types
 * Do this in a file accessible by both the server and client.
 * return {Object} on client will be object like {permissionName: "templateName", ....},
 * on server side: {permissionName: true, ....},
 * @deprecated
 */
UniUsers.availablePermissions = function () {
    return _availablePermissions;
};

UniUsers.validators = {
    /**
     * @deprecated
     * @param username
     * @param userId
     * @returns {boolean}
     */
    checkUsername: function (username, userId) {
        if (!username || username.length < 4) {
            throw new Meteor.Error(403, 'Username must have at least 4 characters');
        }
        var usernamePattern = /^[a-z][a-z0-9_\.]+$/g;
        if (!usernamePattern.test(username)) {
            throw new Meteor.Error(
                403,
                'Username format is incorrect. Only lowercase letters and numbers are accepted');
        }
        var u = Meteor.users.findOne({username: username});
        if (u && (!userId || (u._id !== userId))) {
            throw new Meteor.Error(403, 'Username already in use.');
        }
        return true;
    },
    /**
     * @deprecated
     * @param address
     * @param userId
     * @returns {boolean}
     */
    checkEmailAddress: function (address, userId) {
        if (address) {
            let emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i;
            if (!emailPattern.test(address)) {
                throw new Meteor.Error(400, 'Email Address format is incorrect.');
            }
            let u = Meteor.users.findOne({emails: {$elemMatch: {address: address}}});
            if (u && (!userId || (u._id !== userId))) {
                throw new Meteor.Error(400, 'Email Address already in use.');
            }
            return true;
        }
        return false;
    },
    /**
     * @deprecated
     * @param name
     * @returns {boolean}
     */
    checkDisplayName: function (/* name */) {
        return true;
    }
};

if (Meteor.isServer) {
    /**
     * @deprecated
     * @param name
     * @param value
     * @returns {*}
     */
    UniUsers.UniUser.prototype.setPermission = function (name, value) {
        if (!_.isString(name) && !_.isUndefined(UniUsers.availablePermissions[name])) {
            throw new Meteor.Error(404, 'Permission unknown! ' +name);
        }
        var toSet = {};
        toSet['permissions.'+name] = value;
        return this.update({$set: toSet});
    };
}
