if (Meteor.isServer) {
    Meteor.methods({
        createCollectionWithRemote: function (name, withAllow, withDeny) {
            check(name, String);
            var c = new UniCollection(name);
            COLLECTIONS[name] = c;
            c.methods({
                getA () {
                    return this.collection && this.collection.getCollectionName();
                },
                getC () {
                    return this.collection.call('getA');
                }
            });
            c.docMethods({
                getB () {
                    return this.document && this.document.getCollectionName();
                },
                getD () {
                    return this.document && this.document.call('getB');
                }
            });

            c.allow({
                insert: () => true
            });

            withAllow && c.allow({
                getA: () => true,
                getB: () => true,
                getC: () => true,
                getD: () => true
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

Tinytest.addAsync('UniCollection - Remote Methods - collection', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call("createCollectionWithRemote", collName, true);
    }
    var coll = new UniCollection(collName);
    coll.methods({
        getA () {
            return this.collection && this.collection.getCollectionName();
        }
    });
    coll.allow({
        getA: () => true
    });
    test.equal(typeof UniUtils.get(coll, '_methodHandlersToCall.getA'), 'function');

    coll.call('getA', (e, name) => {
        test.isFalse(!!e);
        test.equal(name, collName);
    });

    onComplete();
});

Tinytest.addAsync('UniCollection - Remote Methods - document', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithRemote', collName, true);
    }
    var coll = new UniCollection(collName);
    coll.docMethods({
        getB () {
            return this.document && this.document.getCollectionName();
        }
    });
    coll.allow({
        getB: () => true
    });
    test.equal(typeof UniUtils.get(coll, '_methodHandlersToCall.UniDoc/getB'), 'function');

    coll.insert({cristo: 'rabani'}, () => {
        if (Meteor.isClient) {
            Meteor.subscribe('qwertyuiop_' + collName, () => {
                var doc = coll.findOne();
                doc.call('getB', (e, name) => {
                    test.isFalse(!!e);
                    test.equal(name, collName);
                    onComplete();
                });
            });
            return;
        }
        var doc = coll.findOne();
        doc.call('getB', (e, name) => {
            test.isFalse(!!e);
            test.equal(name, collName);
        });
        onComplete();
    });


});

Tinytest.addAsync('UniCollection - Remote Methods - without latency compensation', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithRemote', collName, true);
        var coll = new UniCollection(collName);
        coll.apply('getA', (e, name) => {
            test.isFalse(!!e);
            test.equal(name, collName);
        });
        coll.call('getC', (e, name) => {
            test.isFalse(!!e);
            test.equal(name, collName);
        });
        coll.insert({cristo: 'rabani'}, () => {
            Meteor.subscribe('qwertyuiop_' + collName, () => {
                var doc = coll.findOne();
                doc.call('getB', (e, name) => {
                    test.isFalse(!!e);
                    test.equal(name, collName);
                    onComplete();
                });
            });
        });
        return;
    }
    onComplete();
});

Tinytest.addAsync('UniCollection - Remote Methods - trusted stack', function (test, onComplete) {
    var collName = 'rm_' + Random.id();

    if (Meteor.isClient) {
        Meteor.call('createCollectionWithRemote', collName, true, true);
        var coll = new UniCollection(collName);
        coll.apply('getA', (e) => {
            test.isTrue(!!e);
        });
        coll.apply('getC', (e, name) => {
            test.isFalse(!!e);
            test.equal(name, collName);
        });
        coll.insert({cristo: 'rabani'}, () => {
            Meteor.subscribe('qwertyuiop_' + collName, () => {
                var doc = coll.findOne();
                doc.call('getB', (e) => {
                    test.isTrue(!!e);
                    doc.call('getD', (e, name) => {
                        test.isFalse(!!e);
                        test.equal(name, collName);
                        onComplete();
                    });
                });
            });
        });
        return;
    }
    onComplete();
});
