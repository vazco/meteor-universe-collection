<img src="http://uniproject.vazco.eu/black_logo.png" />
# Universe Collection
##### ( replacement of Mongo.Collection ) #####
Collections on steroids, you can defined own documents helpers by adding its using simple helpers method,
or by preparing own class inherited from UniCollection.UniDoc.

All documents know to what collection, belong.
In simple way you can get collection from document and even make update like this: 

```
doc.update({$set: {title: 'new title'}})
```

And because this are EJSONable document types, you can use them for example with Session and ReactiveDict.

UniCollection inherits from Mongo.Collection, but does not change original Mongo.Collection.
Another good thing is that, UniCollection works with packages like aldeed:simple-schema and matb33:collection-hooks.


## Installation

```sh
    $ meteor add vazco:universe-collection
```

### How to use

#### Creating collection
Instead of using standard:

```
Colls.Books = new Mongo.Collection('Books');
```

use this:

```
 Colls.Books = new UniCollection('Books');
```

Universe collection (as opposed to Meteor Collection) always must have name.
If you want create a local collection please pass in options property: `connection: null`, instead null as a first parameter
 
### Methods on collection object
- `setDocumentPrototype(transformationObject)` 

    Sets transformation function for collection.
    
    Function passed as an argument will be executed for each document

    to transform selected documents before the method (like: find, findOne) returns them.

    UniDoc is a default of document prototype.
    (You can also pass it in collection constructor in options as a key 'documentPrototype')


```
    var collection = new UniCollection('some');
    
    // getting new prototype of UniDoc
    var myDocProto = UniDoc.extend();
    
    //Adding new method to prototype of myDoc.
    myDocProto.prototype.getTitleUppercase = function(){ return this.title.toLocaleUpperCase(); }
    
    //setting new prototype to collection
    collection.setDocumentPrototype(myDocProto); 
    
    var docInstance = collection.findOne();
    console.log(docInstance.getTitleUppercase());
```

- `helpers(objectWithMethods)`

       Using this method you can add new helpers function into document prototype.

       It's alternative way to setDocumentPrototype.

       All of this methods will be added to returned document by function find, findOne.

       Documents helpers did not depend from transformationObject.

```
    var collection = new UniCollection('some');
    collection.helpers({
          getTitleUppercase: function(){
                return this.title.toLocaleUpperCase();
          }
    });
    
    var docInstance = collection.findOne();
    console.log(docInstance.getTitleUppercase());
```

- `methods`
    Remote methods on collection that can be invoked over the network by clients from collection instance.
    
    From UniCollection you can define and call remote methods (just like Meteor.methods and Meteor.call).
    
    Additionally, handler will be have in context a collection object under this.collection.
     Rest things like userId, connection are same as handlers in Meteor.methods have. 
    
    Remote methods on collection are inspired by insert/update function 
    and all of them have callbacks for allow/deny methods. 
    Which are called on invocation, but only first method in single invocation stack is validated.
    It mean that one function on server side calls another, "allow/deny" validation will be checked only for first one.
    
```
    var collection = new UniCollection('some');
    collection.methods({
        noneDirectly: function(){
            console.log('called by other');
        },
        getX: function(a, b, c){
            console.log(a, b, c);
        },
        getY: function(){
            if(Meteor.isServer){
               return this.collection.call('noneDirectly');
            }
        }
    });
    //also you can provide callbacks for deny function
    collection.allow({
        //value of document variable will be null for remote collection methods    
        getX: function(userId, document, args, invocation){
            return true;
        },
        //only for remote methods from document will be have object of doc in this argument
        getY: function(userId, document, args, invocation){
                return true;
        }
    });
    //call with params
    collection.call('getX', 1, 2, 3);
    //Invoke a method passing an array of arguments.
    collection.apply('getX', [1, 2, 3]);
    //calling with callback
    collection.call('getY', function(error, result){ console.log(error, result); });
```    

- `docMethods`    
    Remote methods on document that can be invoked over the network by clients from document instance.
    
    Works in the same way as collection.methods but additionally handler will be have a document object in context
     (this.document)
     
```
    var collection = new UniCollection('some');
    collection.docMethods({
        addItem: function(item){
            return this.document.update({$set: {item: item}});            
        }
    });
    //also you can provide callbacks for deny function
    collection.allow({  
        addItem: function(userId, document, args, invocation){
            return true;
        }
    });
    
    var doc = collection.findOne();
    doc.call('addItem', 'someItem', function(error, result){ console.log(error, result); });
```   

- `hasDocument(docOrId)`

    Checks if document belongs to this collection


- `addErrorSupportToUpdates(onErrorFn)`

      Adds error support for all updates on client side, even if callback for update wasn't provided.

      When update is unsuccessful function 'onErrorFn' will be called

      param onErrorFn (optional) If is not passed then UniUI.setErrorMessage

      for 'header' place will be called or alert if UniUI.setErrorMessage is missing

      (You can override this logic by replacing UniCollection._showError)

- `setDefaultSort(options)`

    Adds default sort options to find,

    but default sort option are used only when someone call find without sort options

```
    Colls.Books.setDefaultSort({ title: 1 })
```

- `ensureUniDoc(docOrId, pattern=this.matchingDocument(), errorMessage=)`

    Ensures that returned document is matched against pattern.

    It accepts document but also id of existing document.

    If the match fails, ensureUniDoc throws a Match.Error

    but if you set a custom `errorMessage` the Meteor.Error will be thrown, instead.

```
    var book = Colls.Books.ensureUniDoc(book);

    var book =  Colls.Books.ensureUniDoc(bookId);
```

    As a default matcher is used If pattern was not set as a default will be used this.matchingDocument()

    but you can precise the pattern by passing patterns for fields to the this.matchingDocument().

    And even you can use every (meteor match patterns)[http://docs.meteor.com/#matchpatterns]


- `matchingDocument(keysPatterns=)`

    Pattern argument to checking functions like: this.ensureUniDoc(), check() and Match.test()

    Basic pattern checks document type if type is equal to current constructor of documents in this collection.

    Additionally you can precise patterns for fields of document, using keysPatterns

```
    var book =  Colls.Books.ensureUniDoc(book, Colls.Books.matchingDocument({title: String}));
```


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



- `observeCount(selector, callbacks)`
    Observe count for query. Establishes a live query that invokes callbacks when the count of results was changed.

    Available callbacks:

--         `changed` - called each time count was changed (after initialized),
--         `incremented` - called each time count increased (after initialized),
--         `decremented` - called each time count decreased (after initialized),
--         `initialized` - will be called once on initialized observe.

       Ex.: {decremented: function(currentCount){ console.log('currentCount', currentCount);}}
       Returns a live query handle, which is an object with a stop method.
       Call stop with no arguments to stop calling the callback functions and tear down the query.

## Documents Methods
You can add new methods for transforming documents in two ways

### Simple way:
You can use Collection.helpers method to register new methods to objects.

```
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

```
Template.books.helpers({
    books: function() {
    return Colls.Books.find();
    }
});
```

with the corresponding template:

```
<template name="books">
    <ul>
        {{#each books}}
            <li>{{title}} by {{owner.getName}}</li>
        {{/each}}
    </ul>
</template>
```

### EJSONable document types

Every constructor of documents, is registering as new EJSON type. It is made under name `collectionName+"Doc"`

Because of that Meteor is able to use types of universe document in:

fully allowing your type in the return values or arguments to methods.
storing your type client-side in Minimongo.
allowing your type in Session variables, ReactiveDict and other places.

## Default methods on UniCollection.UniDoc
#### (They are default on each universe document) ####

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
##### ( replacement of Meteor.users ) #####

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

-   `UniUsers.ensureUniUser(user, patternForMatch, errorMessage)`

   Same as Colls.Books.ensureUniDoc but as a default it takes the logged in user,

   but only if first parameter is undefined.

   So, something like that can prevent: `UniUsers.ensureUniUser(user||null)`

- `UniUsers.hasDocument(docOrId)`

   Checks if document belongs to UniUsers collection

   (on client side you must have this doc in minimongo [subscription needed])


- `UniUsers.setNewPermissionType(permissionName, description`

   Add new permission type (Must be called on both sides client&server)

   Each permission adds to user prototype new method like `user.getPermission<PermissionName>()`

   **example:** `getPermissionModerator`

   which is an helper to checking current permission state


-  `UniUsers.availablePermissions()`

    Returns: on client an object of key/value pairs, like:  {permissionName: templateNameOfField, ....}
    on server side: {permissionName: true, ....},

Setting new permission for user you can set only on server side, by method on universe user

`user.setPermission(name, value)`

## Documents methods on user object

-    `getName()` returns profile.name of user

-    `getFirstEmailAddress()` returns first email address

-    `isLoggedIn()` checks if this user is logged in (works on client and publication)

-    `isAdmin()` checks if user has flag is_admin === true
     (You can override this method in `UniUsers.UniUser` and checks something else)

-    `setPermission(name, value)` sets permission on current user (is available on server)

## Additional extensions for this package:

- [Universe Access & Mappings](https://atmospherejs.com/vazco/universe-access)
- [Universe Update Operators On Document](https://atmospherejs.com/vazco/universe-update-operators-on-document)


Copyright and license
Code and documentation © 2015 Vazco.eu
Released under the MIT license.

This package is part of Universe, a package ecosystem based on Meteor platform maintained by Vazco.
It works as standalone Meteor package, but you can get much more features when using the whole system.