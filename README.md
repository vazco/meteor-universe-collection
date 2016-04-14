<a href="http://unicms.io"><img src="http://unicms.io/banners/standalone.png" /></a>

# Universe Collection
Universe Collections allows you to extend Meteor Collections by allowing you to define your own remote collection methods, add document helpers using a simple helpers method, and by creating new classes inherited from UniCollection.UniDoc.

Features:
- Remote (RPC) methods od document and collections
- Multi Schemas support
- Hooks for many methods (e.g. insert, update, remove, own rpc methods etc.)
- Document Helpers (like update from doc, doc.save(), user.getName())
- EJSON serialization of documents
- Mixins for collection
- Compatibility with argument-audits-check
- Allow/Deny for any rpc methods (not only insert/update/remove)

And many other useful stuff

> *Current version is for Meteor 1.3*

> *For Meteor 1.2 please install last version of 2.2.x*

All documents know to what collection, belong.
In simple way you can get collection from document and even make update like this:

```js
doc.update({$set: {title: 'new title'}});
doc.call('addItem', item);
```

And because this are EJSONable document types, you can use them for example with Session and ReactiveDict.

UniCollection inherits from Mongo.Collection, but does not change original Mongo.Collection.
SimpleSchema integration allows you to attach a schemas to collection and validates against chosen (or default) schema.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

  - [Installation](https://github.com/vazco/meteor-universe-collection/#installation)
    - [How to use](https://github.com/vazco/meteor-universe-collection/#how-to-use)
      - [Creating collection](https://github.com/vazco/meteor-universe-collection/#creating-collection)
    - [Methods on collection object](https://github.com/vazco/meteor-universe-collection/#methods-on-collection-object)
  - [Schemas](https://github.com/vazco/meteor-universe-collection/#schemas)
    - [Default schema for a Collection](https://github.com/vazco/meteor-universe-collection/#default-schema-for-a-collection)
    - [Additional schemas for a Collection](https://github.com/vazco/meteor-universe-collection/#additional-schemas-for-a-collection)
    - [Passing Options](https://github.com/vazco/meteor-universe-collection/#passing-options)
    - [Additional SimpleSchema Options](https://github.com/vazco/meteor-universe-collection/#additional-simpleschema-options)
  - [Remote methods](https://github.com/vazco/meteor-universe-collection/#remote-methods)
    - [Remote methods on collection](https://github.com/vazco/meteor-universe-collection/#remote-methods-on-collection)
    - [Remote methods on document](https://github.com/vazco/meteor-universe-collection/#remote-methods-on-document)
  - [Documents Helpers](https://github.com/vazco/meteor-universe-collection/#documents-helpers)
    - [Simple way:](https://github.com/vazco/meteor-universe-collection/#simple-way)
    - [By Inheritance:](https://github.com/vazco/meteor-universe-collection/#by-inheritance)
    - [Example use within a blaze template](https://github.com/vazco/meteor-universe-collection/#example-use-within-a-blaze-template)
  - [Hooks](https://github.com/vazco/meteor-universe-collection/#hooks)
    - [Example](https://github.com/vazco/meteor-universe-collection/#example)
    - [Context of hook handler](https://github.com/vazco/meteor-universe-collection/#context-of-hook-handler)
      - [Shared context](https://github.com/vazco/meteor-universe-collection/#shared-context)
      - [Stuff in context](https://github.com/vazco/meteor-universe-collection/#stuff-in-context)
      - [Useful helpers in UniUtils](https://github.com/vazco/meteor-universe-collection/#useful-helpers-in-uniutils-in-package-universeutilities)
    - [Direct call without hooks](https://github.com/vazco/meteor-universe-collection/#direct-call-without-hooks)
    - [Arguments passed to hook](https://github.com/vazco/meteor-universe-collection/#arguments-passed-to-hook)
  - [Mixins](https://github.com/vazco/meteor-universe-collection/#mixins)
    - [Mounting](https://github.com/vazco/meteor-universe-collection/#mounting)
    - [Attached mixins in this package](https://github.com/vazco/meteor-universe-collection/#attached-mixins-in-this-package)
      - [BackupMixin](https://github.com/vazco/meteor-universe-collection/#backupmixin)
        - [Options](https://github.com/vazco/meteor-universe-collection/#options)
        - [API](https://github.com/vazco/meteor-universe-collection/#api)
        - [Example](https://github.com/vazco/meteor-universe-collection/#example-1)
      - [PublishAccessMixin](https://github.com/vazco/meteor-universe-collection/#publishaccessmixin)
        - [Example](https://github.com/vazco/meteor-universe-collection/#example-2)
        - [Parameters](https://github.com/vazco/meteor-universe-collection/#parameters)
      - [ShowErrorMixin](https://github.com/vazco/meteor-universe-collection/#showerrormixin)
    - [Creating own mixin](https://github.com/vazco/meteor-universe-collection/#creating-own-mixin)
    - [EJSONable document types](https://github.com/vazco/meteor-universe-collection/#ejsonable-document-types)
  - [Default methods on UniCollection.UniDoc](https://github.com/vazco/meteor-universe-collection/#default-methods-on-unicollectionunidoc)
  - [UniUsers](https://github.com/vazco/meteor-universe-collection/#uniusers)
    - [Methods on UniUsers](https://github.com/vazco/meteor-universe-collection/#methods-on-uniusers)
  - [Documents methods on user object](https://github.com/vazco/meteor-universe-collection/#documents-methods-on-user-object)
  - [Publications (UniCollection.Publish)](https://github.com/vazco/meteor-universe-collection/#publications-unicollectionpublish)
    - [Simple way](https://github.com/vazco/meteor-universe-collection/#simple-way)
    - [Parameters](https://github.com/vazco/meteor-universe-collection/#parameters-1)
      - [options {Object}](https://github.com/vazco/meteor-universe-collection/#options-object)
    - [Low-level publish api](https://github.com/vazco/meteor-universe-collection/#low-level-publish-api)
    - [Using with build-in mappings](https://github.com/vazco/meteor-universe-collection/#using-with-build-in-mappings)
    - [Accessibility for users](https://github.com/vazco/meteor-universe-collection/#accessibility-for-users)
      - [users only](https://github.com/vazco/meteor-universe-collection/#users-only)
      - [admins only](https://github.com/vazco/meteor-universe-collection/#admins-only)
  - [Additional extensions for this package](https://github.com/vazco/meteor-universe-collection/#additional-extensions-for-this-package)
  - [Integration with attendant third party packages](https://github.com/vazco/meteor-universe-collection/#integration-with-attendant-third-party-packages)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

```sh
    $ meteor add universe:collection
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
- `setDocumentClass(transformationObject)`

Sets transformation function for collection.

Function passed as an argument will be executed for each document

to transform selected documents before the method (like: find, findOne) returns them.

UniDoc is a default of document prototype.
(You can also pass it in collection constructor in options as a key 'setDocumentClass')


```js
    var collection = new UniCollection('some');

    // getting new prototype of UniDoc
    var myDocProto = UniDoc.extend();

    //Adding new method to prototype of myDoc.
    myDocProto.prototype.getTitleUppercase = function(){ return this.title.toLocaleUpperCase(); }

    //setting new prototype to collection
    collection.setDocumentClass(myDocProto);

    var docInstance = collection.findOne();
    console.log(docInstance.getTitleUppercase());
```

- `docHelpers(objectWithMethods)`

Using this method you can add new helpers function into document prototype.

It's alternative way to setDocumentClass.

All of this methods will be added to returned document by function find, findOne.

Documents helpers did not depend from transformationObject. *Details you can find in helpers section.*

```js
    var collection = new UniCollection('some');
    collection.docHelpers({
          getTitleUppercase: function(){
                return this.title.toLocaleUpperCase();
          }
    });

    var docInstance = collection.findOne();
    console.log(docInstance.getTitleUppercase());
```

- `create` Creates new instance of document for current collection. Create method accepts arguments rawDoc, options.

```js
// empty not saved instance of doc
    var docInstance = collection.create();
// warning: some of methods cannot work properly without some fields
    console.log(docInstance.getCollectionName());
```
You can pass a raw object of document and save it after or save it in the moment of creation by options parameter.

```js
//  not saved instance of doc
    var docInstance = collection.create({title: 'abc'});
// manual save
    docInstance.save();
// saving it in the moment of creation
 var docInstance2 = collection.create({title: 'abcd'}, true);
// saving it in the moment of creation with different schema
  var docInstance3 = collection.create({title: 'abcde'}, {save: true, useSchema: 'schemaName'});
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

- `setDefaultSort(options)`

Adds default sort options to find,
but default sort option are used only when someone call find without sort options

```js
    Colls.Books.setDefaultSort({ title: 1 })
```

- `ensureUniDoc(docOrId, additionalPattern, errorMessage=)`

This method gives warranty that returned object is document of current collection
but if this method cannot return a proper document it will throw error
You can provide additional Match.* patterns as a supplement of this.matchingDocument()
- `docOrId` {UniCollection.UniDoc|String|*} document or id of available document that satisfies pattern
- `additionalPattern` {Object=} Additional regiments that mast be checked.
If true is passed under this argument, then this method will fetch fresh data even if document is correct.
- `errorMessage` {String=undefined} Custom message of error
Ensures that returned document is matched against pattern.


```js
    var book = Colls.Books.ensureUniDoc(book);
    var book =  Colls.Books.ensureUniDoc(bookId);
```

This function works on top of meteor match and can be safely used with `audit-argument-checks` package
More: (meteor match patterns)[http://docs.meteor.com/#matchpatterns]


- `matchingDocument(keysPatterns=)`

Pattern argument to checking functions like: this.ensureUniDoc(), check() and Match.test()

Basic pattern checks document type if type is equal to current constructor of documents in this collection.

Additionally you can precise patterns for fields of document, using keysPatterns

```js
    var book =  Colls.Books.ensureUniDoc(book, Colls.Books.matchingDocument({title: String}));
    // or 
    Match.test(Colls.Books.matchingDocument({title: String}));
    // or
    check(doc, Colls.Books.matchingDocument());
```

- `ensureMongoIndex(indexName, keys, options = {})`
Creates an index on the specified field if the index does not already exist.
If universe detects,that index under name is changed,
mechanism will drop the old index under name passed as first parameter to this function.
 - Params
  - {string} indexName Unique name of index for this collection
  - {object} keys An Object that contains the field and value pairs where the field is the index key
 and the value describes the type of index for that field.
 For an ascending index on a field, specify a value of 1; for descending index, specify a value of -1.
  - {object} options Optional. A document that contains a set of options that controls the creation of the index.

- `dropMongoIndex(indexName)`
Drops the specified index from a collection.

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
//getting default schema
collection.getSchema()
//or
collection.getSchema('default')
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
//getting additional schema
collection.getSchema('expanded_schema')
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
UniCollection package adds additional options uniUI in this section.

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

Take a look that rules for Allow/Deny can be added only when method for given rule is already created for universe collection or document.

So, you cannot set rules allow or deny before `collection.methods`, or `collection.docMethods`.

### Remote methods on document
You can define methods that will be available to invoke over the network from document instance.

Works in the same way as collection.methods but additionally handler will be have a document object in context  (this.document)

```js
    var collection = new UniCollection('some');
    collection.docMethods({
        addItem: function(item) {
            console.log('Called from doc: ', this.document._id);
            return this.document.update({$set: {item: item}});
        }
    });
    //also you can provide callbacks for deny function
    collection.allow({
        addItem: function(userId, document, args, invocation) {
            check(args, [String]);
            return true;
        }
    });

    var doc = collection.findOne();
    doc.call('addItem', 'someItem', function(error, result){ console.log(error, result); });
```

## Documents Helpers
You can add new methods for transforming documents in two ways

### Simple way:
You can use Collection.helpers method to register new methods to objects.

```js
    Colls.Books = new UniCollection('Books');

    //Adding methods to documents
    Colls.Books.docHelpers({
        read: function(){
            this.isReaded = true;
            this.save();
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

Note that: Methods added by docHelpers methods always are on the top of inheritance.
You can change object class for document but methods added by docHelpers always are accesible. 

### Example use within a blaze template

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

## Hooks
sync hooks: 'find','findOne','setSchema','create'
with async support: 'insert','update','remove', 'upsert'
hooks can be added for all remote methods on collection and documents

- `onBeforeCall(hookName [, idName], method, isOverride=false)`
- `onAfterCall(hookName [, idName], method, isOverride=false)`

Removing unnecessary hooks
- `offBeforeCall(hookName, idName)`
- `offAfterCall(hookName, idName)`

### Example

```
var col = new UniCollection('some');

col.onBeforeCall('insert', 'myAwesomeInsert', function(doc){
  console.log('will be inserted', doc, 'to collection:', this.getCollection());
});

col.onBeforeCall('update', 'myAwesomeUpdate', function(selector, modifier, options){
  this.oldDoc = this.getCollection().findOne(selector);
});

col.onAfterCall('update', 'afterAwesomeUpdate', function(selector, modifier, options){
  console.log('Old doc:', this.oldDoc, 'new doc:', this.getCollection().findOne(selector));
});

coll.insert({title: 'Awesome doc'});

coll.update({title: 'Awesome doc'}, {$set: {title: 'Much more awesome doc'}});

coll.offBeforeCall('insert', 'myAwesomeInsert');

coll.insert({title: 'Awesome doc2'});

```

### Context of hook handler
#### Shared context
Context of all hooks is shared. It mean that you can add something in before hook and read it in onAfterCall.

```
collection.update({_id: 'a23df2c5dfK'}, {$set: { title: 'something'}});
collection.onBeforeCall('update', 'myGreatHook', function(selector, modifier){
    this.doc = collection.findOne(selector);
});

collection.onAfterCall('update', 'myGreatHookAfterUpdate', function(){
    console.log('before update doc looked like this', this.doc);
});
```

#### Stuff in context
Helpers
- `getCollection()` Collection instance
- `getMethodName()` Hook for method
- `getMethodContext()` Context of method for which is hook
- `callDirect()` Direct access to method (without any hooks)
- `isAfter()` It tells if hook is after or before
- `currentHookId` current idName of hook

Available only in before hooks, that can be potentially async methods (like insert/update/remove)
- `getCallback()` It returns callback function if exists
- `setCallback()` It sets new callback for async method

Available only in after hooks
- `getResult()`  gives returned value of executed method

**Specific Helpers**

Some of functions like update, upsert, have a additional special helpers in context.

- `getPreviousDocs()` is available for hooks of update, upsert and remove
This method returns all documents that are selected by selector to current action.
- `getFields()`  is available for hooks of update and upsert methods
And returns an array of top level fields, which will be changed by modificator.
- `getPreviousDoc()` is available for hooks of all remote methods attached to the document.
Returns fetched document, that is bound with method.


#### Additional useful helpers in UniUtils (in package: universe:utilities)

- `UniUtils.getFieldsFromUpdateModifier(modifier)`
Gets array of top-level fields, which will be changed by modifier (this from update method)
- `UniUtils.getPreviewOfDocumentAfterUpdate(updateModifier, oldDoc = {}) `
Gets simulation of new version of document passed as a second argument

### Direct call without hooks
Any call of method inside of `collection.withoutHooks(function, list)`, will be called (as a default) without hooks. 
You can pass a list of hooks that should be omitted. 
Some special words can deactivate group of hooks like BEFORE, AFTER or ALL (what is default)

Example:
```
myCollection.withoutHooks(function () {
     myCollection.update('abc234', {$set: {title: 'Updated without hooks!'}})
});
```

### Arguments passed to hook
Hook handler has the same parameter as are passed for method.
Only callbacks passed as last argument are provided by this.getCallback() instead of be in arguments.

```
collection.onBeforeCall('update', 'argumentsLogger', function(selector, modifier, options) {
   console.log('argumentsLogger', selector, modifier, options).
});
```

## Mixins
Simple way to extend your collection in new features.

### Mounting
 To add some mixin to collection, just create new instance of mixin class
 and pass them to as a item of array, under key mixins in options of UniCollection constructor.
```
myColl = new UniCollection('myColl', {
    mixins: [
        new UniCollection.mixins.BackupMixin({expireAfter: 86400}),
        new UniCollection.mixins.PublishAccessMixin(),
        new UniCollection.mixins.ShowErrorMixin()
    ],
});
```
As you can see some of mixins can have own options, that can be passed to constructor.
### Attached mixins in this package
#### BackupMixin
This mixin provides backup functionality to your collection. Backup is stored in
`collection.backupCollection`. By default, it is fully automatic,
so when any document is removed, you can easily restore it. Example is available
[here](http://unicollection.backupmixin.meteor.com/).

Mixin provides also support for [TTL indexes](http://docs.mongodb.org/manual/core/index-ttl/), so
backup can be automatically removed - set `expireAfter` to desired time (in seconds).

##### Options

  - `name`, default `'Backup'` - backup collection suffix
  - `expireAfter`, default `false` - time to expire (in seconds) - `false` mean no expiration
  - `backupOnRemove`, default `true` - if true, performs `.backup()` before remove
  - `removeOnRestore`, default `true` - if true, removes data from backup after `.restore()`
  - `upsertOnRestore`, default `false` - if true, `.restore()` performs `.upsert()`, `.insert()` otherwise

##### API

  - `collection.backup([selector])` copies docs to `collection.backupCollection`
  - `collection.restore([selector], [options])` copies docs back from `collection.backupCollection`

##### Example

```js
collection = new UniCollection('collection', {
    mixins: [
        new UniCollection.mixins.BackupMixin()
    ]
});

collection.insert({number: 1});
collection.insert({number: 2});
collection.insert({number: 3});

collection.find().count(); // 3
collection.remove();       // all documents are copied to collection.backupCollection
collection.find().count(); // 0
collection.restore();      // all documents are copied to collection
collection.find().count(); // 3
```
#### PublishAccessMixin
PublishAccessMixin adds access control to UniCollection.publish
This works like insert or update, to collection.allow and collection.deny will be added new validator named "publish"

##### Example

```
 collection.allow({
       publish: function(userId, doc, publicationName){
           return true;
      }
  });
 
  collection.deny({
       publish: function(userId, doc, publicationName){
           return doc.ownerId !== userId;
       }
  });
```

##### Parameters

- {string} `userId` The user 'userId' wants to subscribe document 'doc' from this collection.
- {object} `doc` document that might be published
- {string} `publicationName` name of publication if is available.

Return true if this should be allowed.
WARNING: This rule will be respected only by 'UniCollection.publish',
Meteor.publish is expected to do their own access to checking instead relying on allow and deny.

#### ShowErrorMixin
Gets errors (if are) from insert, update, upsert, remove
and passing them to show error function

```
new ShowErrorMixin(params={})
params:
      name - name of mixin
      errorDisplayer - function that will be responsible as a showing the error message,
      like e.g. showError(exceptionOrString) // if function is not declared, as a default it will try use UniUI.setErrorMessage, if missing fallback to alert() 
      addForMethods: //Adds only for this one
          insert: true, upsert: true, update: true, remove: true
          (as a value can be passed a custome function of errorDisplayer)
```


### Creating own mixin
There are two ways.
One of them is just simple using inheritance by es6 from abstract class `UniCollection.AbstractMixin`

```
class MyNewMixin extends UniCollection.AbstractMixin {

    constructor({name = 'MyNewMixin', ...params} = {}) {
        super(name);
    }

    mount(collection, options = {}) {
        // do something on mount to collection
    }
}
```

But if you don't use es6 or you want different, there is another way (using of UniCollection.createMixinClass)

```
var MyNewMixin = UniCollection.createMixinClass({
    name: 'MyNewMixin',
    mount(collection, options = {}) {
        // do something on mount to collection
    }
});
```

Collection when attaches a mixin to self,
it launches method mount on mixin where pass self as a first argument and self options as a second one.

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

- `save(options, cb)`

    Saves all or chosen keys in current document.
    options.fieldsList, options.useSchema or pass fieldsList instead options


- `refresh()`

    refind doc and refresh fields in current document


- `findSelf()`

    returns fresh instance of current document


- `getCollection()`
    returns collection to which current document belongs.

# UniUsers
##### ( extension of Meteor.users ) #####

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
   
- `UniUsers.runWithUser = (userId, func, args, context)` (server only)
   
   Adds a posibility of run function on server side as a user.
   So, UniUsers.getLoggedIn() and UniUsers.getLoggedInId() will be working correctly.

## Documents methods on user object

-    `getName()` returns profile.name of user

-    `getFirstEmailAddress()` returns first email address

-    `isLoggedIn()` checks if this user is logged in (works on client and publication)

-    `isAdmin()` checks if user has flag is_admin === true
     (You can override this method in `UniUsers.UniUser` and checks something else)

# Publications (UniCollection.Publish)
Of course this package works great with standard meteor publication mechanism.
But if you want something more, this package provides additional mechanism for it.
UniCollection.published works just like Meteor.publish but has a few additional stuff.
- Simple mappings of relations or possibility of access control (by mixin)
- Another benefit is that UniCollection.publish can be dynamically changed (redeclared)
- Possibility of setting by options accessibility like: publication is only for users or only for admins. 
No more checking `if(!this.userId){ this.ready(); return;}`

## Simple way

```
UniCollection.publish('example', function() {
    return [Colls.MyColl.find(), Colls.Books.find()];
});
```
You can return one Collection.Cursor, an array of Collection.Cursors.
If a publish function does not return a cursor or array of cursors,
it is assumed to be using the low-level added/changed/removed interface, and it must also call ready once the initial record set is complete.

## Parameters
- `name` Name of the record set.
If null, the set has no name, and the record set is automatically sent to all connected clients
(if you use mixin "PublishAccessMixin" then with access control)
- `handler` {Function} Function called on the server each time a client subscribes.
Inside the function, this is the publish handler object, described below.
If the client passed arguments to subscribe, the function is called with the same arguments.
### options {Object}
- `override` {boolean} resets handler for publication name. (only named publication can be overridden)
- `userOnly` {boolean} publication will be available only for users
- `adminOnly` {boolean} publication will be available only for admins

## Low-level publish api

```
UniCollection.publish('example', function() {
    var self = this;
    var handle = Colls.Books.find({roomId: roomId}).observeChanges({
        added: function (id, fields) {
            self.added("books", id, fields);
        },
        changed: function (id, fields, allowedFields) {
            self.changed("books", id, fields);
        },
        removed: function (id, fields) {
            self.removed("books", id);
        }
    });
    self.onStop(function () {
        handle.stop();
    });
});
```
- `allowedFields` Dictionary of fields possible return or exclude from it. ( They should be the same as was passed to options.fields in find() method. ) You can get allowed/excluded fields directly from cursor:
Server side:
var allowedFields = cursor._cursorDescription.options.fields

## Using with build-in mappings

This package provides simple way mapping mechanism.
You must return base collection or collections and using method setMappings, define relational mappings

```
UniCollection.publish('example', function() {
    this.setMappings(Colls.MyColl, [
        //Map a value of organisationsIds from selected documents of Colls.MyColl to document from Colls.Rooms
        {
            key: 'organisationsIds',
            collection: Colls.Rooms
        },
        //Map ids of selected document of Colls.MyColl to document from Meteor.users where orgIds = id
        {
                    key: 'orgIds',
                    collection: Meteor.users,
                    reverse: true // reverse direction of the relationship (inverse relationship is more complex)
        }
     ]);
    //For mapped users you can map another documents
    this.setMappings(Meteor.users, [
            {
                key: 'organisationsIds',
                collection: Colls.Rooms,
                reverse: true

            }
    ]);
    //And another....
    this.setMappings(Colls.Rooms, [
        {
            key: 'roomId',
            reverse:true,
            collection: Colls.Documents,
            options: {fields: { title: 1 }}
        }
    ]);

    return Colls.MyColl.find();
});
```
## Accessibility for users

### users only
```
UniCollection.publish('example', function() {
    return Colls.Books.find();
}, {userOnly:true});
```

### admins only
```
UniCollection.publish('example', function() {
    return Colls.Books.find();
}, {adminOnly:true});
```

# Support for Universe modules

```
import {UniCollection, UniUsers, UniDoc, UniUser, BackupMixin, PublishAccessMixin} from 'meteor/universe:collection';
```

## Additional extensions for this package

- [Universe Collection Links](https://atmospherejs.com/universe/collection-links)

## Integration with attendant third party packages
If you have problems with integration collection2 or collection-hooks

check it out following package:

[universe:fixes-for-third-party-packages](https://atmospherejs.com/universe/fixes-for-third-party-packages)

Copyright and license
Code and documentation © 2015 Vazco.eu
Released under the MIT license.

This package is part of Universe, a package ecosystem based on Meteor platform maintained by Vazco.
It works as standalone Meteor package, but you can get much more features when using the whole system.
