import UniUsers from './UniUsers';
import {isFunction, isString} from './utils';

UniUsers.getRestrictedFields = function () {
    return ['is_admin', 'permissions', '_id'];
};

var _checkIfContainsRestrictedFields = function (fieldNames) {
    fieldNames = _toLowerCase(fieldNames);
    var restrictedFields =  _toLowerCase(UniUsers.getRestrictedFields());
    var foundFields = _.intersection(restrictedFields, fieldNames);
    return Array.isArray(foundFields) && foundFields.length;
};

UniUsers.deny({
    update: function (userId, doc, fieldNames) {
        var user = UniUtils.getUniUserObject(userId, false);
        if (!UniUsers.hasDocument(user) || !isFunction(user.isAdmin) || !user.isAdmin()) {
            return _checkIfContainsRestrictedFields(fieldNames);
        }
    }
});

var _toLowerCase = function (fieldNames) {
    return fieldNames.map(f => {
        return f && (isString(f) ? f.toLowerCase(): f);
    });
};
