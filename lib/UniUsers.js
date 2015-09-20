
var _userIdFromPublication;
// ----- Collection clone -----
/* global UniUsers: true */
if(Meteor.users){

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
