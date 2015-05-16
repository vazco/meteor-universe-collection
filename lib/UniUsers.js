'use strict';
var _userIdFromPublication;
// ----- Collection clone -----
/* global UniUsers: true */
UniUsers = Object.create(Meteor.users);

_.each(UniCollection.prototype, function(f, k){
    if(k !== 'constructor'){
        UniUsers[k] = f;
    }
});

UniUsers._getCollection = function(){
    return UniUsers;
};

/**
 * Adds a UniUser datatype to EJSON.
 */
UniUsers._registerDocConstructorAsANewEJSONType();

UniCollection._uniCollections[UniUsers._name] = UniUsers;
// ----- Static methods -----

UniUsers.getLoggedInId = function () {
    var userId;

    if (Meteor.isClient) {
        userId = Meteor.userId && Meteor.userId();
    } else if (Meteor.isServer) {
        try {
            userId = Meteor.userId && Meteor.userId();
        } catch (e) {}

        if (!userId) {
            // Gets userId from publication.
            userId = _userIdFromPublication.get();
        }
    }

    return userId;
};

UniUsers.getLoggedIn = function () {
    return this.findOne(this.getLoggedInId());
};

UniUsers.isLoggedIn = function () {
    return !!this.getLoggedInId();
};

UniUsers.isAdminLoggedIn = function () {
    var user = UniUsers.getLoggedIn();
    if(!user){
        return false;
    }
    return user.isAdmin();
};

var _availablePermissions = {};
/**
 * Add new permission type (Must be called on both sides)
 * You must add new permission typ on server and client side
 * On UniUser you will be have function: user.getPermission<PermissionName>
 * @example    for example moderator -> user.getPermissionModerator
 * @param permissionName
 * @param templateNameOfField If you use UniUI as a default will be loaded 'UniUsers_defaultPermissionField'
 */
UniUsers.setNewPermissionType = function (permissionName, templateNameOfField) {
    check(permissionName, String);

    if(Meteor.isServer){
        templateNameOfField = true;
    }

    if(!UniUsers.defaultPermissionField && !templateNameOfField){
        throw new Meteor.Error(404, 'Missing default permission field template name.' +
        ' please define it in "UniUsers.defaultPermissionField" or use UniUI package');
    }
    _availablePermissions[permissionName] = templateNameOfField || UniUsers.defaultPermissionField;

    var fnName = permissionName.charAt(0).toUpperCase() + permissionName.slice(1);
    UniUsers.UniUser.prototype['getPermission'+fnName] = function(){
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
 */
UniUsers.availablePermissions = function () {
    return _availablePermissions;
};

UniUsers.validators = {
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
    checkEmailAddress: function (address, userId) {
        if (address) {
            var emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]+\b/i;
            if (!emailPattern.test(address)) {
                throw new Meteor.Error(400, 'Email Address format is incorrect.');
            }
            var u = Meteor.users.findOne({emails: {$elemMatch: {address: address}}});
            if (u && (!userId || (u._id !== userId))) {
                throw new Meteor.Error(400, 'Email Address already in use.');
            }
            return true;
        }
        return false;
    },
    checkDisplayName: function (name) {
        return true;
    }
};

if (Meteor.isServer) {
    _userIdFromPublication = new Meteor.EnvironmentVariable();
    var _publish = Meteor.publish;
    Meteor.publish = function (name, func) {
        return _publish.call(this, name, function () {
            var context = this, args = arguments;
            return _userIdFromPublication.withValue(context && context.userId, function () {
                return func.apply(context, args);
            });
        });
    };
}

/**
 * Same as this.ensureUniDoc but as a default it takes the logged in user,
 * but only if first parameter is undefined.
 * So something like that can prevent: UniUsers.ensureUniUser(user||null)
 * @param user {UniUsers.UniUser|String|undefined|*} User uni document or id to existing user doc,
 * or undefined for current logged in. User will be check by patternForMatch.
 * @param patternForMatch Pattern to match value against, if nothing was set UniUsers.matchingDocument() will be used.
 * You can additionally check fields on user doc by params to UniUsers.matchingDocument().
 * @param errorMessage {String=undefined} Customize error message
 * @returns {UniCollection.UniDoc|*}
 */
UniUsers.ensureUniUser = function (user, patternForMatch, errorMessage) {
    if (_.isUndefined(user)) {
            user = UniUsers.getLoggedIn();
    }
    if(arguments.length < 2){
        patternForMatch = this.matchingDocument();
    }
    return this.ensureUniDoc(user, patternForMatch, errorMessage);
};
