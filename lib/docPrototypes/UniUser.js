'use strict';
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
UniUsers.setConstructor(UniUser, true);
UniUsers.UniUser = UniUser;