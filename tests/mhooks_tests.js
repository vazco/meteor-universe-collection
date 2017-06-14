if (Meteor.isServer) {
    Meteor.methods({
        createCollectionWithHooks: function (name, withAllow, withDeny) {
            check(name, String);
            var c = new UniCollection(name);
            COLLECTIONS[name] = c;
            c.methods({
                getA () {
                    return this.collection && this.collection.getCollectionName();
                }
            });
            c.docMethods({
                getB () {
                    return this.document && this.document.getCollectionName();
                }
            });

            c.allow({
                insert: () => true
            });

            c.onBeforeCall('insert', 'myStop', function (doc) {
                doc.isGetCallback = typeof this.getCallback === 'function';
                doc.isSetCallback = typeof this.setCallback === 'function';
                if (doc.stop) {
                    console.log('imh', doc); // eslint-disable-line no-console
                    return false;
                }
                if (doc.withCb) {
                    doc.isCallFn = typeof this.getCallback() === 'function';
                }
            });
            c.onAfterCall('insert', 'myInsert', function () {
                c.withoutHooks(function () {
                    c.insert({_id: 'eq12'});
                });
            });

            withAllow && c.allow({
                getA: () => true,
                getB: () => true
            });

            withDeny && c.deny({
                getA: () => true,
                getB: () => true
            });

            c.insert({cristo: 'rabani'});
            UniCollection.publish('qwertyuiop_' + name, () => c.find());
        }
    });
}

Tinytest.addAsync('UniCollection - Hooks collection and context', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithHooks', collName, true);
    }
    var coll = new UniCollection(collName);
    coll.methods({
        getAn () {
            return this.collection && this.collection.getCollectionName();
        }
    });

    coll.docMethods({
        getB () {
            return this.document && this.document.getCollectionName();
        }
    });

    coll.allow({
        getB: () => true,
        getAn: () => true
    });
    const p1 = 2, p2 = 3;

    coll.onBeforeCall('getAn', 'geta', function (a1, a2) {
        test.equal(this.currentHookId, 'geta');
        test.equal(a1, p1);
        test.equal(a2, p2);
        test.isFalse(this.isAfter());
        this.to = 7;
    });

    coll.onAfterCall('getAn', 'getA2', function () {
        test.equal(this.to, 7);
        test.equal(this.getMethodName(), 'getAn');
    });

    coll.call('getAn', p1, p2, () => {
        onComplete();
    });


});

Tinytest.addAsync('UniCollection - Hooks inserts and doc metchods', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithHooks', collName, true);
    }
    var coll = new UniCollection(collName);
    coll.methods({
        getA () {
            return this.collection && this.collection.getCollectionName();
        }
    });

    coll.docMethods({
        getB () {
            return this.document && this.document.getCollectionName();
        }
    });

    coll.allow({
        getB: () => true,
        getA: () => true
    });
    const p1 = 2, p2 = 3;

    coll.onAfterCall('UniDoc.getB', 'getB', function (a1, a2) {
        test.equal(this.currentHookId, 'getB');
        test.equal(this.getCollection().getCollectionName(), collName);
        test.equal(a1, p1, 'arguments expected');
        test.equal(a2, p2, 'arguments expected');
        test.isTrue(this.isAfter());
    });

    coll.insert({cristo: 'rabani'}, () => {
        if (Meteor.isClient) {
            Meteor.subscribe('qwertyuiop_' + collName, () => {
                var doc = coll.findOne();
                test.equal(doc.isGetCallback, true, 'added by hook');
                test.equal(doc.isSetCallback, true, 'added by hook');
                doc.call('getB', p1, p2, (e, name) => {
                    test.isFalse(!!e);
                    test.equal(name, collName);
                    onComplete();
                });
            });
            return;
        }
        var doc = coll.findOne();
        doc.call('getB', p1, p2, (e, name) => {
            test.isFalse(!!e);
            test.equal(name, collName);
            onComplete();
        });
    });
});

