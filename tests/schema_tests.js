SimpleSchema.debug = true;
var schema = {
    title: {type: String},
    createdAt: {
        type: Date,
        autoValue: function () {
            if (this.isInsert) {
                return this.value || new Date();
            }
        },
        optional: true
    },
    updatedAt: {
        type: Date,
        autoValue: function () {
            if (this.isUpdate) {
                return new Date();
            }
        },
        optional: true
    }
};

var schema2 = {
    cristo: {
        type: String
    },
    updatedAt: {
        type: Date,
        autoValue: function () {
            if (this.isUpdate) {
                return new Date();
            }
        },
        optional: true
    }
};

if (Meteor.isServer) {
    Meteor.methods({
        createCollectionWithSchema: function (name, options, canUseSchema2) {
            check(name, String);
            var c = new UniCollection(name, options);
            c.setSchema(schema);
            canUseSchema2 && c.setSchema('schema2', schema2);
            COLLECTIONS[name] = c;
            c.allow({
                insert: () => true,
                update: () => true,
                remove: () => true
            });
            UniCollection.publish('c-' + name, function () {
                return c.find();
            });
        }
    });
}
Tinytest.add('UniCollection Schema - adds new schema', function (test) {
    var coll = new UniCollection('coll_' + Random.id());

    coll.setSchema(new SimpleSchema({
        title: {type: String}
    }));

    coll.setSchema('schema2', new SimpleSchema({
        title: {type: String}
    }));

    test.instanceOf(coll.getSchema(), SimpleSchema);
    test.instanceOf(coll.getSchema('schema2'), SimpleSchema);
    test.instanceOf(coll.simpleSchema(), SimpleSchema);
});

Tinytest.addAsync('UniCollection Schema - insert - default - negative test', function (test, onComplete) {
    var collName = 'insert1n_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, true);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema(schema2);
    coll.insert({title: 'some'}, (err) => {
        test.isTrue(!!err);
        if (Meteor.isClient) {
            Meteor.subscribe('c-' + collName, () => {
                test.equal(coll.find({aas: 2}).count(), 0);
                onComplete();
            });
        } else {
            test.equal(coll.find({aas: 2}).count(), 0);
            onComplete();
        }

    });
});

Tinytest.addAsync('UniCollection Schema - insert - default - positive test', function (test, onComplete) {
    var collName = 'insert1p_' + Random.id();
    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, schema);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.insert({title: 'alals'}, (err) => {
        test.isFalse(!!err);
        if (Meteor.isClient) {
            Meteor.subscribe('c-' + collName, () => {
                test.equal(coll.find({title: 'alals'}).count(), 1);
                onComplete();
            });
        } else {
            test.equal(coll.find({title: 'alals'}).count(), 1);
            onComplete();
        }
    });
});

Tinytest.addAsync('UniCollection Schema - insert - second schema - negative test', function (test, onComplete) {
    var collName = 'insert2n_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {});
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({title: 'no'}, {useSchema: 'schema2'}, (err) => {
        test.isTrue(!!err);
        if (Meteor.isClient) {
            Meteor.subscribe('c-' + collName, () => {
                test.equal(coll.find({title: 'no'}).count(), 0);
                onComplete();
            });
        } else {
            test.equal(coll.find({title: 'no'}).count(), 0);
            onComplete();
        }

    });
});

Tinytest.addAsync('UniCollection Schema - insert - second schema - positive test', function (test, onComplete) {
    var collName = 'insert2p_' + Random.id();
    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, schema);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({cristo: 'rabani'}, {useSchema: 'schema2'}, (err) => {
        test.isFalse(!!err);
        if (Meteor.isClient) {
            Meteor.subscribe('c-' + collName, () => {
                test.equal(coll.find({cristo: 'rabani'}).count(), 1);
                onComplete();
            });
        } else {
            test.equal(coll.find({cristo: 'rabani'}).count(), 1);
            onComplete();
        }
    });
});
//--- updates
Tinytest.addAsync('UniCollection Schema - update - default - negative test', function (test, onComplete) {
    var collName = 'update1n_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, true);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({title: 'abc'}, (e, id) => {
        coll.update(id, {$set: {asf: 'negative'}}, () => {
            if (Meteor.isClient) {
                Meteor.subscribe('c-' + collName, () => {
                    test.equal(coll.find({_id: id, asf: 'negative'}).count(), 0);
                    onComplete();
                });
            } else {
                test.equal(coll.find({_id: id, asf: 'negative'}).count(), 0);
                onComplete();
            }

        });
    });

});

Tinytest.addAsync('UniCollection Schema - update - default - positive test', function (test, onComplete) {
    var collName = 'update1p_' + Random.id();
    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, schema);
        Meteor.subscribe('c-' + collName);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({title: 'abc'}, (err, id) => {
        coll.update(id, {$set: {title: 'abc2'}}, (err) => {
            test.isFalse(!!err);
            if (Meteor.isClient) {
                Meteor.subscribe('c-' + collName, () => {
                    test.equal(coll.find({_id: id, title: 'abc2'}).count(), 1);
                    onComplete();
                });
            } else {
                test.equal(coll.find({_id: id, title: 'abc2'}).count(), 1);
                onComplete();
            }
        });
    });

});

Tinytest.addAsync('UniCollection Schema - update - second schema - negative test', function (test, onComplete) {
    var collName = 'update2n_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, true);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({title: 'yes'}, (e, id) => {
        coll.update(id, {$set: {title: 'abc'}}, {useSchema: 'schema2'}, () => {
            if (Meteor.isClient) {
                Meteor.subscribe('c-' + collName, () => {
                    test.equal(coll.find({_id: id, title: 'abc'}).count(), 0);
                    onComplete();
                });
            } else {
                test.equal(coll.find({_id: id, title: 'abc'}).count(), 0);
                onComplete();
            }

        });
    });

});

Tinytest.addAsync('UniCollection Schema - update - second schema - positive test', function (test, onComplete) {
    var collName = 'update2p_' + Random.id();
    if (Meteor.isClient) {
        Meteor.call('createCollectionWithSchema', collName, {}, schema);
    }
    var coll = new UniCollection(collName, {});
    coll.setSchema(schema);
    coll.setSchema('schema2', schema2);
    coll.insert({title: 'ala ma kota'}, (e, id) => {
        const value = 'rabani_' + (Meteor.isClient? 'client': 'server');
        coll.update(id, {$set: {cristo: value}}, {useSchema: 'schema2'}, (e) => {
            if (Meteor.isClient) {
                Meteor.subscribe('c-' + collName, () => {
                    test.equal(coll.find({_id: id, cristo: value}).count(), 1);
                    onComplete();
                });
            } else {
                test.equal(coll.find({_id: id, cristo: value}).count(), 1);
                onComplete();
            }
        });
    });

});