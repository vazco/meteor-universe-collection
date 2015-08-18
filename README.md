<img src="http://uniproject.vazco.eu/black_logo.png" />
# Universe Collection
##### ( replacement of Mongo.Collection ) #####
Collections on steroids, you can defined own documents helpers by adding its using simple helpers method,
or by preparing own class inherited from UniCollection.UniDoc.

All documents know to what collection, belong.
In simple way you can get collection from document and even make update like this: 

```js
doc.update({$set: {title: 'new title'}});
doc.call('addItem', item);
```

And because this are EJSONable document types, you can use them for example with Session and ReactiveDict.

UniCollection inherits from Mongo.Collection, but does not change original Mongo.Collection.
SimpleSchema integration allows you to attach a schemas to collection and validates against chosen (or default) schema.
Another good thing is that, UniCollection works with package matb33:collection-hooks.


## Installation

```sh
    $ meteor add vazco:universe-collection
```

### How to use

#### Creating collection
Instead of using standard:

```js
Colls.Books = new Mongo.Collection('Books');
```

use this:

```js
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


```js
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

```js
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

- `docMethods`    
    Remote methods on document that can be invoked over the network by clients from document instance.
    

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

```js
    Colls.Books.setDefaultSort({ title: 1 })
```

- `ensureUniDoc(docOrId, pattern=this.matchingDocument(), errorMessage=)`

    Ensures that returned document is matched against pattern.

    It accepts document but also id of existing document.

    If the match fails, ensureUniDoc throws a Match.Error

    but if you set a custom `errorMessage` the Meteor.Error will be thrown, instead.

```js
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

```js
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

## Schemas

UniCollection allows you to attach **one or more schemas** to collection.
Every insert and update from client or server code will be automatically validates against schema.
You can choose for inserting and updating a different schema than default by options.

This package requires and automatically installs the aldeed:simple-schema package,
which defines the schema syntax and provides the validation logic.

### Default schema for a Collection

```js
collection.setSchema(new SimpleSchema({
    title: {
        type: String,
        label: "Title",
        max: 200
    },
    author: {
        type: String,
        label: "Author"
    }
}));

// or

collection.setSchema('default', new SimpleSchema({
    title: {
        type: String
    },
    author: {
        type: String,
        label: "Author"
    }
}));
```

Now that our collection has a schema, we can do a validated insert on either the client or the server:

```js
collection.insert({title: "Ulysses", author: "James Joyce"}, function(error, result) {
  //The insert will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //
  //The list of errors is available on `error.invalidKeys` or by calling collection.getSchema().namedContext().invalidKeys()
});
```

Or we can do a validated update:

```js
collection.update(book._id, {$unset: {copies: 1}}, function(error, result) {
  //The update will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //
  //The list of errors is available on `error.invalidKeys` or by calling collection.getSchema().namedContext().invalidKeys()
});
```

### Additional schemas for a Collection

```js
collection.setSchema('expanded_schema', new SimpleSchema({
    title: {
        type: String,
        label: 'Title',
        max: 200
    },
    'co-authors': {
        type: String,
        optional: true        
    },
    summary: {
        type: String,
    }
}));
```

Our collection has a secondary schema, we can do a validated insert by that schema:

```js
collection.insert({title: "Ulysses", author: "James Joyce"}, {useSchema: 'expanded_schema'}, function(error, result) {
  //The insert will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //
  //The list of errors is available on `error.invalidKeys` or by calling collection.getSchema('expanded_schema').namedContext().invalidKeys()
});
```

Or we can do a validated update by that schema:

```js
collection.update(book._id, {$unset: {copies: 1}}, {useSchema: 'expanded_schema'}, function(error, result) {
  //The update will fail, error will be set,
  //and result will be undefined or false because "copies" is required.
  //The list of errors is available on `error.invalidKeys` or by calling collection.getSchema('expanded_schema').namedContext().invalidKeys()
});
```
### Passing Options

In Meteor, the `update` function accepts an options argument. UniCollection changes the `insert` function signature to also accept options in the same way, as an optional second argument. Whenever this documentation says to "use X option", it's referring to this options argument. For example:
```js
collection.insert(doc, {useSchema: schemaName});
```
Like we see, you can choose schema by the key named "useSchema" provided in options for update and insert.

### Additional SimpleSchema Options

In addition to all the other schema validation options documented in the 
[simple-schema](https://github.com/aldeed/meteor-simple-schema) package, the
UniCollection package adds additional options explained in this section.

#### denyInsert and denyUpdate

If you set `denyUpdate: true`, any collection update that modifies the field
will fail. For instance:
```js
var PostSchema = new SimpleSchema({
  title: {
    type: String
  },
  content: {
    type: String
  },
  createdAt: {
    type: Date,
    denyUpdate: true
  }
});

collection.setSchema(PostSchema);
```

The `denyInsert` option works the same way, but for inserts. If you set
`denyInsert` to true, you will need to set `optional: true` as well. 

## Remote methods
    UniCollection provides remote methods on collections and documents. 
    This works like Meteor.methods, Meteor.call, Meteor.apply but it works on collection and document.
    
### Remote methods on collection
    This kind of methods can be invoked over the network by clients from collection instance.
    
    From UniCollection you can define and call remote methods (just like Meteor.methods and Meteor.call).
    
    Additionally, handler will be have in context a collection object under this.collection.
     Rest things like userId, connection are same as handlers in Meteor.methods have. 
    
    Remote methods on collection are inspired by insert/update function 
    and all of them have callbacks for allow/deny methods. 
    Which are called on invocation, but only first method in single invocation stack is validated.
    It mean that one function on server side calls another, "allow/deny" validation will be checked only for first one.
    
```js
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

### Remote methods on document    
    You can define methods that will be available to invoke over the network from document instance.
    
    Works in the same way as collection.methods but additionally handler will be have a document object in context
     (this.document)
     
```js
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

## Documents Methods
You can add new methods for transforming documents in two ways

### Simple way:
You can use Collection.helpers method to register new methods to objects.

```js
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

```js
var book = Colls.Books.findOne();
//All documents will be have before defined functions
book.read();
```

### By Inheritance:
Inheritance takes place by  calling extend() method on other UniDoc object

```js
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

```js
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
