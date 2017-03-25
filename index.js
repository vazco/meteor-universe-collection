import _UniCollection from './lib/UniCollection';
import _UniDoc from './lib/docPrototypes/UniDoc';
import {getBasicSchema} from './lib/BasicSchema';
import _UniUsers from './lib/UniUsers';
import _UniUser from './lib/docPrototypes/UniUser';
import './lib/UniSecure';

_UniCollection.UniDoc = _UniDoc;
UniDoc = _UniDoc;
_UniCollection.getBasicSchema = getBasicSchema;
UniCollection = _UniCollection;
_UniUsers.UniUser = _UniUser;
UniUser = _UniUser;
UniUsers = _UniUsers;

