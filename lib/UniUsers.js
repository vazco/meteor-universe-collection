import {UniCollection} from './UniCollection';

export let UniUsers;
var _userIdFromPublication;
// ----- Collection clone -----
if (Meteor.users) {
    UniUsers = Object.create(UniCollection.prototype);
    Object.keys(Meteor.users).forEach(k => {
        UniUsers[k] = Meteor.users[k];
    });
    UniUsers._init('users');

} else {
    UniUsers = new UniCollection('users');
}


//----- Static methods -----

UniUsers.getLoggedInId = function () {
    var userId;

    if (Meteor.isClient) {
        userId = Meteor.userId && Meteor.userId();
    } else if (Meteor.isServer) {
        try {
            userId = Meteor.userId && Meteor.userId();
        } catch (e) {
            userId = false;
        }

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
    if (!user) {
        return false;
    }
    return user.isAdmin();
};

if (Meteor.isServer) {
    _userIdFromPublication = new Meteor.EnvironmentVariable();
    UniUsers.runWithUser = (userId, func, args = [], context) => {
        return _userIdFromPublication.withValue(userId, function () {
            return func.apply(context, args);
        });
    };
    let _publish = Meteor.publish;
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
 * @param additionalPattern {Object=} Additional regiments that mast be checked.
 * If true is passed under this argument, then this method will fetch fresh data even if document is correct.
 * @param errorMessage {String=undefined} Customize error message
 * @returns {UniCollection.UniDoc|*}
 */
UniUsers.ensureUniUser = function (user, ...params) {
    if (!user) {
        user = UniUsers.getLoggedIn();
    }
    return this.ensureUniDoc(user, ...params);
};

export default UniUsers;

