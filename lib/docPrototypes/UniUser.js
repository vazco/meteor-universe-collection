'use strict';
// ----- Prototype methods -----

var UniUser = class UniUser extends UniCollection.UniDoc {
    constructor (doc) {
        if(typeof doc.isAdmin !== "undefined"){
            console.warn('Name of property on document is same as function name on document! ' +
                '[converting isAdmin:String to is_admin]');
            doc.is_admin = doc.isAdmin;
            delete doc['isAdmin'];
        }
        super(doc);
    }
    getName () {
        if (this.profile) {
            return this.profile.name;
        }
    }
    getFirstEmailAddress () {
        if (this.emails && this.emails.length) {
            return UniUtils.get(this, 'emails.0.address')
        }
    }

    isLoggedIn () {
        return UniUsers.getLoggedInId() === this._id;
    }

    isAdmin () {
        return this.is_admin;
    }
};

UniUsers.UniUser = UniUser;
UniUsers.setDocumentClass(UniUsers.UniUser);
