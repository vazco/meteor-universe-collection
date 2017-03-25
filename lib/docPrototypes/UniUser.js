import {UniDoc} from './UniDoc';
import {UniUsers} from '../UniUsers';

export class UniUser extends UniDoc {
    constructor (doc) {
        if (typeof doc.isAdmin !== 'undefined') {
            console.warn('Name of property on document is same as function name on document! ' +
                '[converting isAdmin:boolean to is_admin]');
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
            return UniUtils.get(this, 'emails.0.address');
        }
    }

    isLoggedIn () {
        return UniUsers.getLoggedInId() === this._id;
    }

    isAdmin () {
        return this.is_admin;
    }
}

UniUsers.UniUser = UniUser;
UniUsers.setDocumentClass(UniUsers.UniUser);

export default UniUser;
