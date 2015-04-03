'use strict';
var _userIdFromPublication;

// ----- Prototype methods -----

var UniUser = UniCollection.UniDoc.extend();

UniUser.prototype.getName = function () {
    if (this.profile) {
        return this.profile.name;
    }
};

UniUser.prototype.getFirstEmailAddress = function () {
    if (this.emails && this.emails.length) {
        return UniUtils.get(this, 'emails.0.address')
    }
};

UniUser.prototype.isLoggedIn = function () {
    return UniUsers.getLoggedInId() === this._id;
};


UniUser.prototype.isAdmin = function () {
    return this.is_admin;
};

if(Meteor.isServer){
  UniUser.prototype.setPermission = function (name, value) {
    if(!_.isString(name) && !_.isUndefined(UniUsers.availablePermissions[name])){
      throw new Meteor.Error(404, 'Permission unknown! ' +name);
    }
    var toSet = {};
    toSet['permissions.'+name] = value;
    return this.update({$set: toSet});
  };
}

// ----- Collection clone -----
/* global UniUsers: true */
UniUsers = Object.create(Meteor.users);

UniUsers.UniUser = UniUser;

UniUsers._getCollection = function(){
    return UniUsers;
};

UniUsers.setConstructor = UniCollection.prototype.setConstructor;
UniUsers.helpers = UniCollection.prototype.helpers;

UniUsers.setConstructor(UniUser);
UniCollection._uniCollections[UniUsers._name] = UniUsers;
// ----- Static methods -----

UniUsers.getLoggedInId = function () {
    var userId;

    if (Meteor.isClient) {
        userId = Meteor.userId && Meteor.userId();
    }

    if (Meteor.isServer) {
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


/**
 * Checks if document belongs to this collection
 * @param doc object or id (on client side you must have this doc in minimongo![subscription needed])
 * @returns boolean
 */
UniUsers.hasDocument = function(doc){
    if(!doc){
        return false;
    } else if(_.isString(doc)){
        doc = UniUsers.findOne(doc);
    }
    return UniCollection.isDocumentFromCollection(doc, UniUsers._name);
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
    UniUser.prototype['getPermission'+fnName] = function(){
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

UniUsers.ensureUniUser = function (user, noLoggedAsDefault, patternForMatch) {
    if (!user) {
        if (!noLoggedAsDefault) {
            user = UniUsers.getLoggedIn();
        }
    } else if (_.isString(user)) {
        user = UniUsers.findOne({_id: user});
    } else if (_.isObject(user) && !(user instanceof UniUsers.UniUser)) {
        //if user object isn't universe document
        user = UniUsers.findOne(user._id);
    }
    if(arguments.length === Function.length){
        check(user, patternForMatch);
    }
    return user;
}
