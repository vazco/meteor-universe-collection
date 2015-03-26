# Universe Collection
( replacement of Mongo.Collection )
Collections on steroids, you can defined own documents helpers by adding its using simple helpers method,
or by preparing own class inherited from UniCollection.UniDoc.

UniCollection inherits from Mongo.Collection, but does not change original Mongo.Collection.
Another good thing is that, UniCollection works with packages like aldeed:simple-schema and matb33:collection-hooks

### How to use

#### Creating collection
Instead of using standard:

```
Colls.Books = new Mongo.Collection('Books');

```

use this:

```
#!javascript

 Colls.Books = new UniCollection('Books');
```

### Methods on collection object
- `setConstructor(transformationObject)`

    Sets transformation function for collection.

    Function passed as an argument will be executed for each document

    to transform selected documents before the method (like: find, findOne) returns them.

    UniDoc is a default of document constructor.



- `helpers(objectWithMethods)`

       Using this method you can add new helpers function into document prototype.

       It's alternative way to setConstructor.

       All of this methods will be added to returned document by function find, findOne



- `hasDocument(docOrId)`

    Checks if document belongs to this collection



- `addErrorSupportToUpdates(onErrorFn)`

      Adds error support for all updates on client side, even if callback for update wasn't provided.

      When update is unsuccessful function 'onErrorFn' will be called

      param onErrorFn (optional) If is not passed then UniUI.setErrorMessage

      for 'header' place will be called or alert if UniUI.setErrorMessage is missing

      (You can override this logic by replacing UniCollection._showError)



- `addErrorSupportToInserts(onErrorFn)`

      Adds error support for all inserts on client side

      It works like addErrorSupportToUpdates



- `addErrorSupportToRemoves(onErrorFn)`

       Adds error support for all removes on client side



- `addErrorSupportToUpserts(onErrorFn)`

       It works like addErrorSupportToUpdates



- `addErrorSupportToAllWriteMethods(onErrorFn)`

    Adds error callback to each one write methods

    param onErrorFn (optional) If is not passed then UniUI.setErrorMessage



- `setDefaultSort(options)`

    Adds default sort options to find,

    but default sort option are used only when someone call find without sort options

```
    Colls.Books.setDefaultSort({ title: 1 })
```

## Documents Methods
You can add new methods for transforming documents in two ways

### Simple way:
You can use Collection.helpers method to register new methods to objects.

```
#!javascript
    Colls.Books = new UniCollection('Books');

    //Adding methods to documents
    Colls.Books.helpers({
        read: function(){
            this.isReaded = true;
            this.save('isReaded');
        }
    });
```

And after that you can use it:

```
var book = Colls.Books.findOne();
//All documents will be have before defined functions
book.read();
```

### By Inheritance:
Inheritance takes place by  calling extend() method on other UniDoc object

```
#!javascript
    //Gets your new independent prototype
    var YourDocProto = UniCollection.UniDoc.extend();

    //Defines your own methods available only in prototype of YourDocProto
    YourDocProto.prototype.getName = function () {
        if (this.name) {
            return this.name;
        }
        return 'unknown';
    };

    Colls.Books.setConstructor(YourDocProto);
```

### Example use within a template

Methods on document you can use instead template helpers:
This can help you of avoiding unnecessary template helpers

```javascript
Template.books.helpers({
    books: function() {
    return Colls.Books.find();
    }
});
```

with the corresponding template:

```html
<template name="books">
    <ul>
        {{#each books}}
            <li>{{title}} by {{owner.getName}}</li>
        {{/each}}
    </ul>
</template>
```

## Default Methods on UniCollection.UniDoc
(They are default on each universe document)

- `extend()`

    prepare copy of prototype UniDoc, to separate your future methods from base UniDoc



- `update(modifier, options, cb)`

    Performs update on current document

    It works like update on collection but without first parameter

    (which is an id of current document)



- `remove(options, cb)`

    Performs remove on current document



- `save(fieldsList)`

    Saves selected keys in current document



- `refresh()`

    refind doc and refresh fields in current document



- `findSelf()`

    returns fresh instance of current document



- `getCollection()`
    returns collection to which current document belongs.

# UniUsers
( replacement of Meteor.users )

Universe provides UniUsers object which is a copy of Meteor.users collection object that shares the same document with.
Meteor.users collection stay unmodiefied. Both operates on the same documents, only methods to access objects have changed.

### Methods on UniUsers

- `UniUsers.getLoggedInId()`

    Gets the current user id, or null if no user is logged in. A reactive data source.

    It works in publish functions (difference to Meteor.userId())


- `UniUsers.getLoggedIn()`

    Gets the current user record, or null if no user is logged in. A reactive data source.

    It works in publish functions (difference to Meteor.userId())


- `UniUsers.isAdminLoggedIn()`

    Checks if the current user is an admin

    It is depended on user method `user.isAdmin()`


- `UniUsers.hasDocument(docOrId)`

   Checks if document belongs to UniUsers collection

   (on client side you must have this doc in minimongo![subscription needed])


- `UniUsers.setNewPermissionType(permissionName, description`

   Add new permission type (Must be called on both sides client&server)

   Each permission adds to user prototype new method like `user.getPermission<PermissionName>()`

   **example:** `getPermissionModerator`

   which is an helper to checking current permission state


-  `UniUsers.availablePermissions()`

    Returns an object of key/value pairs, like:  {permissionName: "Permission Description", ....}

Setting new permission for user you can set only on server side, by method on universe user

`user.setPermission(name, value)`

## Documents Methods on user object

-    `getName()` returns profile.name of user

-    `getFirstEmailAddress()` returns first email address

-    `isLoggedIn()` checks if this user is logged in (works on client and publication)

-    `isAdmin()` checks if user has flag is_admin === true
     (You can override this method in `UniUsers.UniUse` and checks something else)

-    `setPermission(name, value)` sets permission on current user (is available on server)

## Additional extensions for this package:

[Universe Access & Mappings](https://atmospherejs.com/vazco/universe-access)
[Universe Update Operators On Document](https://atmospherejs.com/vazco/universe-update-operators-on-document)
