/*eslint no-inner-declarations:0 camelcase:0 */

// We keep track of the collections, so we can refer to them by name
COLLECTIONS = {};

if (Meteor.isServer) {
    Meteor.methods({
        createInsecureCollection: function (name, options) {
            check(name, String);
            check(options, Match.Optional({
                idGeneration: Match.Optional(String)
            }));
            var c = new UniCollection(name, options);
            COLLECTIONS[name] = c;
            c.allow({
                insert: () => true,
                update: () => true,
                remove: () => true
            });
            UniCollection.publish('c-' + name, function () {
                return c.find();
            });
        },
        dropInsecureCollection: function (name) {
            var c = COLLECTIONS[name];
            c._dropCollection();
        }
    });
}

// We store the generated id, keyed by collection, for each insert
// This is so we can test the stub and the server generate the same id
var INSERTED_IDS = {};

Meteor.methods({
    insertObjects: function (collectionName, doc, count) {
        var c = COLLECTIONS[collectionName];
        var ids = [], i, id;
        for (i = 0; i < count; i++) {
            id = c.insert(doc);
            INSERTED_IDS[collectionName] = (INSERTED_IDS[collectionName] || []).concat([id]);
            ids.push(id);
        }
        return ids;
    },
    doMeteorCall: function (/* arguments */) {
        var args = Array.prototype.slice.call(arguments);

        return Meteor.call.apply(null, args);
    }
});

var runInFence = function (f) {
    if (Meteor.isClient) {
        f();
    } else {
        var fence = new DDPServer._WriteFence;
        DDPServer._CurrentWriteFence.withValue(fence, f);
        fence.armAndWait();
    }
};

// Helpers for upsert tests
var upsert = function (coll, useUpdate, query, mod, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (useUpdate) {
        if (callback)
            return coll.update(query, mod,
                _.extend({upsert: true}, options),
                function (err, result) {
                    callback(err, !err && {
                        numberAffected: result
                    });
                });
        return {
            numberAffected: coll.update(query, mod,
                _.extend({upsert: true}, options))
        };
    }
    return coll.upsert(query, mod, options, callback);
};

var checkDocument = function (test, docToCheck, againstFields) {
    test.isTrue(typeof docToCheck === 'object');
    test.isTrue(docToCheck instanceof UniCollection.UniDoc);
    var col = docToCheck.getCollection();
    test.isTrue(!!col.ensureUniDoc(docToCheck));
    Object.keys(againstFields).forEach(function (key) {
        test.equal(docToCheck[key], againstFields[key]);
    });
};

var upsertTestMethod = 'livedata_upsert_test_method';
var upsertTestMethodColl;

// This is the implementation of the upsert test method on both the client and
// the server. On the client, we get a test object. On the server, we just throw
// errors if something doesn't go according to plan, and when the client
// receives those errors it will cause the test to fail.
//
// Client-side exceptions in here will NOT cause the test to fail! Because it's
// a stub, those exceptions will get caught and logged.
var upsertTestMethodImpl = function (coll, useUpdate, test) {
    coll.remove({});
    var result1 = upsert(coll, useUpdate, {foo: 'bar'}, {foo: 'bar'});

    if (!test) {
        test = {
            equal: function (a, b) {
                if (!EJSON.equals(a, b))
                    throw new Error('Not equal: ' +
                        JSON.stringify(a) + ', ' + JSON.stringify(b));
            },
            isTrue: function (a) {
                if (!a)
                    throw new Error('Not truthy: ' + JSON.stringify(a));
            },
            isFalse: function (a) {
                if (a)
                    throw new Error('Not falsey: ' + JSON.stringify(a));
            }
        };
    }

    // if we don't test this, then testing result1.numberAffected will throw,
    // which will get caught and logged and the whole test will pass!
    test.isTrue(result1);

    test.equal(result1.numberAffected, 1);
    if (!useUpdate)
        test.isTrue(result1.insertedId);
    var fooId = result1.insertedId;
    var obj = coll.findOne({foo: 'bar'});
    test.isTrue(obj);
    if (!useUpdate)
        test.equal(obj._id, result1.insertedId);
    var result2 = upsert(coll, useUpdate, {_id: fooId},
        {$set: {foo: 'baz '}});
    test.isTrue(result2);
    test.equal(result2.numberAffected, 1);
    test.isFalse(result2.insertedId);
};

if (Meteor.isServer) {
    var m = {};
    m[upsertTestMethod] = function (run, useUpdate, options) {
        check(run, String);
        check(useUpdate, Boolean);
        upsertTestMethodColl = new UniCollection(upsertTestMethod + '_collection_' + run, options);
        upsertTestMethodImpl(upsertTestMethodColl, useUpdate);
    };
    Meteor.methods(m);
}

Meteor._FailureTestCollection =
    new UniCollection('___meteor_failure_test_collection');

// For test 'document with a custom type'
var Dog = function (name, color, actions) {
    var self = this;
    self.color = color;
    self.name = name;
    self.actions = actions || [{name: 'wag'}, {name: 'swim'}];
};
_.extend(Dog.prototype, {
    getName: function () {
        return this.name;
    },
    getColor: function () {
        return this.name;
    },
    equals: function (other) {
        return other.name === this.name &&
            other.color === this.color &&
            EJSON.equals(other.actions, this.actions);
    },
    toJSONValue: function () {
        return {color: this.color, name: this.name, actions: this.actions};
    },
    typeName: function () {
        return 'dog';
    },
    clone: function () {
        return new Dog(this.name, this.color);
    },
    speak: function () {
        return 'woof';
    }
});
EJSON.addType('dog', function (o) {
    return new Dog(o.name, o.color, o.actions);
});


// Parameterize tests.
_.each(['STRING', 'MONGO'], function (idGeneration) {

    var collectionOptions = {idGeneration: idGeneration};

    testAsyncMulti('UniCollection - database error reporting. ' + idGeneration, [
        function (test, expect) {
            var ftc = Meteor._FailureTestCollection;

            var exception = function (err) {
                test.instanceOf(err, Error);
            };

            _.each(['insert', 'remove', 'update'], function (op) {
                var arg = (op === 'insert' ? {} : 'bla');
                var arg2 = {};

                var callOp = function (callback) {
                    if (op === 'update') {
                        ftc[op](arg, arg2, callback);
                    } else {
                        ftc[op](arg, callback);
                    }
                };

                if (Meteor.isServer) {
                    test.throws(function () {
                        callOp();
                    });

                    callOp(expect(exception));
                }

                if (Meteor.isClient) {
                    callOp(expect(exception));

                    // This would log to console in normal operation.
                    Meteor._suppress_log(1);
                    callOp();
                }
            });
        }
    ]);


    Tinytest.addAsync('UniCollection - basics, ' + idGeneration, function (test, onComplete) {
        var run = test.runId();
        var coll, coll2;
        if (Meteor.isClient) {
            let unmanaged = _.extend({connection: null}, collectionOptions);
            coll = new UniCollection('basics_coll_' + run, unmanaged); // local, unmanaged
            coll2 = new UniCollection('basics_coll2' + run, unmanaged); // local, unmanaged
        } else {
            coll = new UniCollection('basics_test_collection_' + run, collectionOptions);
            coll2 = new UniCollection('basics_test_collection_2_' + run, collectionOptions);
        }

        var log = '';
        var obs = coll.find({run: run}, {sort: ['x']}).observe({
            addedAt: function (doc, before_index, before) {
                log += 'a(' + doc.x + ',' + before_index + ',' + before + ')';
            },
            changedAt: function (new_doc, old_doc, at_index) {
                log += 'c(' + new_doc.x + ',' + at_index + ',' + old_doc.x + ')';
            },
            movedTo: function (doc, old_index, new_index) {
                log += 'm(' + doc.x + ',' + old_index + ',' + new_index + ')';
            },
            removedAt: function (doc, at_index) {
                log += 'r(' + doc.x + ',' + at_index + ')';
            }
        });

        var captureObserve = function (f) {
            if (Meteor.isClient) {
                f();
            } else {
                var fence = new DDPServer._WriteFence;
                DDPServer._CurrentWriteFence.withValue(fence, f);
                fence.armAndWait();
            }

            var ret = log;
            log = '';
            return ret;
        };

        var expectObserve = function (expected, f) {
            if (!(expected instanceof Array))
                expected = [expected];

            test.include(expected, captureObserve(f));
        };

        test.equal(coll.find({run: run}).count(), 0);
        test.equal(coll.findOne('abc'), undefined);
        test.equal(coll.findOne({run: run}), undefined);

        expectObserve('a(1,0,null)', function () {
            var id = coll.insert({run: run, x: 1});
            test.equal(coll.find({run: run}).count(), 1);
            test.equal(coll.findOne(id).x, 1);
            test.equal(coll.findOne({run: run}).x, 1);
        });

        expectObserve('a(4,1,null)', function () {
            var id2 = coll.insert({run: run, x: 4});
            test.equal(coll.find({run: run}).count(), 2);
            test.equal(coll.find({_id: id2}).count(), 1);
            test.equal(coll.findOne(id2).x, 4);
        });

        test.equal(coll.findOne({run: run}, {sort: ['x'], skip: 0}).x, 1);
        test.equal(coll.findOne({run: run}, {sort: ['x'], skip: 1}).x, 4);
        test.equal(coll.findOne({run: run}, {sort: {x: -1}, skip: 0}).x, 4);
        test.equal(coll.findOne({run: run}, {sort: {x: -1}, skip: 1}).x, 1);


        var cur = coll.find({run: run}, {sort: ['x']});
        var total = 0;
        var index = 0;
        var context = {};
        cur.forEach(function (doc, i, cursor) {
            test.equal(i, index++);
            test.isTrue(cursor === cur);
            test.isTrue(context === this);
            total *= 10;
            if (Meteor.isServer) {
                // Verify that the callbacks from forEach run sequentially and that
                // forEach waits for them to complete (issue# 321). If they do not run
                // sequentially, then the second callback could execute during the first
                // callback's sleep sleep and the *= 10 will occur before the += 1, then
                // total (at test.equal time) will be 5. If forEach does not wait for the
                // callbacks to complete, then total (at test.equal time) will be 0.
                Meteor._sleepForMs(5);
            }
            total += doc.x;
            // verify the meteor environment is set up here
            coll2.insert({total: total});
        }, context);
        test.equal(total, 14);

        index = 0;
        test.equal(cur.map(function (doc, i, cursor) {
            // XXX we could theoretically make map run its iterations in parallel or
            // something which would make this fail
            test.equal(i, index++);
            test.isTrue(cursor === cur);
            test.isTrue(context === this);
            return doc.x * 2;
        }, context), [2, 8]);

        test.equal(_.pluck(coll.find({run: run}, {sort: {x: -1}}).fetch(), 'x'),
            [4, 1]);

        expectObserve('', function () {
            var count = coll.update({run: run, x: -1}, {$inc: {x: 2}}, {multi: true});
            test.equal(count, 0);
        });

        expectObserve('c(3,0,1)c(6,1,4)', function () {
            var count = coll.update({run: run}, {$inc: {x: 2}}, {multi: true});
            test.equal(count, 2);
            test.equal(_.pluck(coll.find({run: run}, {sort: {x: -1}}).fetch(), 'x'),
                [6, 3]);
        });

        expectObserve(['c(13,0,3)m(13,0,1)', 'm(6,1,0)c(13,1,3)',
            'c(13,0,3)m(6,1,0)', 'm(3,0,1)c(13,1,3)'], function () {
            coll.update({run: run, x: 3}, {$inc: {x: 10}}, {multi: true});
            test.equal(_.pluck(coll.find({run: run}, {sort: {x: -1}}).fetch(), 'x'),
                [13, 6]);
        });

        expectObserve('r(13,1)', function () {
            var count = coll.remove({run: run, x: {$gt: 10}});
            test.equal(count, 1);
            test.equal(coll.find({run: run}).count(), 1);
        });

        expectObserve('r(6,0)', function () {
            coll.remove({run: run});
            test.equal(coll.find({run: run}).count(), 0);
        });

        expectObserve('', function () {
            var count = coll.remove({run: run});
            test.equal(count, 0);
            test.equal(coll.find({run: run}).count(), 0);
        });

        obs.stop();
        onComplete();
    });

    Tinytest.addAsync('UniCollection - fuzz test, ' + idGeneration, function (test, onComplete) {

        var run = Random.id();
        var coll;
        if (Meteor.isClient) {
            coll = new UniCollection('fuzz' + run, _.extend({connection: null}, collectionOptions)); // local
        } else {
            coll = new UniCollection('livedata_test_collection_' + run, collectionOptions);
        }

        // fuzz test of observe(), especially the server-side diffing
        var actual = [];
        var correct = [];
        var counters = {add: 0, change: 0, move: 0, remove: 0};

        var obs = coll.find({run: run}, {sort: ['x']}).observe({
            addedAt: function (doc, before_index) {
                counters.add++;
                actual.splice(before_index, 0, doc.x);
            },
            changedAt: function (new_doc, old_doc, at_index) {
                counters.change++;
                test.equal(actual[at_index], old_doc.x);
                actual[at_index] = new_doc.x;
            },
            movedTo: function (doc, old_index, new_index) {
                counters.move++;
                test.equal(actual[old_index], doc.x);
                actual.splice(old_index, 1);
                actual.splice(new_index, 0, doc.x);
            },
            removedAt: function (doc, at_index) {
                counters.remove++;
                test.equal(actual[at_index], doc.x);
                actual.splice(at_index, 1);
            }
        });

        if (Meteor.isServer) {
            // For now, has to be polling (not oplog) because it is ordered observe.
            test.isTrue(obs._multiplexer._observeDriver._suspendPolling);
        }

        var step = 0;

        // Use non-deterministic randomness so we can have a shorter fuzz
        // test (fewer iterations).  For deterministic (fully seeded)
        // randomness, remove the call to Random.fraction().
        var seededRandom = new SeededRandom('foobard' + Random.fraction());
        // Random integer in [0,n)
        var rnd = function (n) {
            return seededRandom.nextIntBetween(0, n - 1);
        };

        var finishObserve = function (f) {
            if (Meteor.isClient) {
                f();
            } else {
                var fence = new DDPServer._WriteFence;
                DDPServer._CurrentWriteFence.withValue(fence, f);
                fence.armAndWait();
            }
        };

        var doStep = function () {
            if (step++ === 5) { // run N random tests
                obs.stop();
                onComplete();
                return;
            }

            var max_counters = _.clone(counters);

            finishObserve(function () {
                var x, val;

                if (Meteor.isServer)
                    obs._multiplexer._observeDriver._suspendPolling();

                // Do a batch of 1-10 operations
                var batch_count = rnd(10) + 1;
                for (var i = 0; i < batch_count; i++) {
                    // 25% add, 25% remove, 25% change in place, 25% change and move
                    var op = rnd(4);
                    var which = rnd(correct.length);
                    if (op === 0 || step < 2 || !correct.length) {
                        // Add
                        x = rnd(1000000);
                        coll.insert({run: run, x: x});
                        correct.push(x);
                        max_counters.add++;
                    } else if (op === 1 || op === 2) {
                        x = correct[which];
                        if (op === 1)
                        // Small change, not likely to cause a move
                            val = x + (rnd(2) ? -1 : 1);
                        else
                        // Large change, likely to cause a move
                            val = rnd(1000000);
                        coll.update({run: run, x: x}, {$set: {x: val}});
                        correct[which] = val;
                        max_counters.change++;
                        max_counters.move++;
                    } else {
                        coll.remove({run: run, x: correct[which]});
                        correct.splice(which, 1);
                        max_counters.remove++;
                    }
                }
                if (Meteor.isServer)
                    obs._multiplexer._observeDriver._resumePolling();

            });

            // Did we actually deliver messages that mutated the array in the
            // right way?
            correct.sort(function (a, b) {
                return a - b;
            });
            test.equal(actual, correct);

            // Did we limit ourselves to one 'moved' message per change,
            // rather than O(results) moved messages?
            _.each(max_counters, function (v, k) {
                test.isTrue(max_counters[k] >= counters[k], k);
            });

            Meteor.defer(doStep);
        };

        doStep();

    });

    Tinytest.addAsync('UniCollection - stop handle in callback, ' + idGeneration, function (test, onComplete) {
        var run = Random.id();
        var coll;
        if (Meteor.isClient) {
            coll = new UniCollection('unmanaged' + run, _.extend({connection: null}, collectionOptions)); // local, unmanaged
        } else {
            coll = new UniCollection('stopHandleInCallback-' + run, collectionOptions);
        }

        var output = [];

        var handle = coll.find().observe({
            added: function (doc) {
                output.push({added: doc._id});
            },
            changed: function (/*newDoc*/) {
                output.push('changed');
                handle.stop();
            }
        });

        test.equal(output, []);

        // Insert a document. Observe that the added callback is called.
        var docId;
        runInFence(function () {
            docId = coll.insert({foo: 42});
        });
        test.length(output, 1);
        test.equal(output.shift(), {added: docId});

        // Update it. Observe that the changed callback is called. This should also
        // stop the observation.
        runInFence(function () {
            coll.update(docId, {$set: {bar: 10}});
        });
        test.length(output, 1);
        test.equal(output.shift(), 'changed');

        // Update again. This shouldn't call the callback because we stopped the
        // observation.
        runInFence(function () {
            coll.update(docId, {$set: {baz: 40}});
        });
        test.length(output, 0);

        test.equal(coll.find().count(), 1);
        test.equal(coll.findOne(docId),
            coll.create({_id: docId, foo: 42, bar: 10, baz: 40}));

        onComplete();
    });

// This behavior isn't great, but it beats deadlock.
    if (Meteor.isServer) {
        Tinytest.addAsync('UniCollection - recursive observe throws, ' + idGeneration, function (test, onComplete) {
            var run = test.runId();
            var coll = new UniCollection('observeInCallback-' + run, collectionOptions);

            var callbackCalled = false;
            var handle = coll.find({}).observe({
                added: function (/*newDoc*/) {
                    callbackCalled = true;
                    test.throws(function () {
                        coll.find({}).observe();
                    });
                }
            });
            test.isFalse(callbackCalled);
            // Insert a document. Observe that the added callback is called.
            runInFence(function () {
                coll.insert({foo: 42});
            });
            test.isTrue(callbackCalled);

            handle.stop();

            onComplete();
        });

        Tinytest.addAsync('UniCollection - cursor dedup, ' + idGeneration, function (test, onComplete) {
            var run = test.runId();
            var coll = new UniCollection('cursorDedup-' + run, collectionOptions);

            var observer = function (noAdded) {
                var output = [];
                var callbacks = {
                    changed: function (newDoc) {
                        output.push({changed: newDoc._id});
                    }
                };
                if (!noAdded) {
                    callbacks.added = function (doc) {
                        output.push({added: doc._id});
                    };
                }
                var handle = coll.find({foo: 22}).observe(callbacks);
                return {output: output, handle: handle};
            };

            // Insert a doc and start observing.
            var docId1 = coll.insert({foo: 22});
            var o1 = observer();
            // Initial add.
            test.length(o1.output, 1);
            test.equal(o1.output.shift(), {added: docId1});

            // Insert another doc (blocking until observes have fired).
            var docId2;
            runInFence(function () {
                docId2 = coll.insert({foo: 22, bar: 5});
            });
            // Observed add.
            test.length(o1.output, 1);
            test.equal(o1.output.shift(), {added: docId2});

            // Second identical observe.
            var o2 = observer();
            // Initial adds.
            test.length(o2.output, 2);
            test.include([docId1, docId2], o2.output[0].added);
            test.include([docId1, docId2], o2.output[1].added);
            test.notEqual(o2.output[0].added, o2.output[1].added);
            o2.output.length = 0;
            // Original observe not affected.
            test.length(o1.output, 0);

            // White-box test: both observes should share an ObserveMultiplexer.
            var observeMultiplexer = o1.handle._multiplexer;
            test.isTrue(observeMultiplexer);
            test.isTrue(observeMultiplexer === o2.handle._multiplexer);

            // Update. Both observes fire.
            runInFence(function () {
                coll.update(docId1, {$set: {x: 'y'}});
            });
            test.length(o1.output, 1);
            test.length(o2.output, 1);
            test.equal(o1.output.shift(), {changed: docId1});
            test.equal(o2.output.shift(), {changed: docId1});

            // Stop first handle. Second handle still around.
            o1.handle.stop();
            test.length(o1.output, 0);
            test.length(o2.output, 0);

            // Another update. Just the second handle should fire.
            runInFence(function () {
                coll.update(docId2, {$set: {z: 'y'}});
            });
            test.length(o1.output, 0);
            test.length(o2.output, 1);
            test.equal(o2.output.shift(), {changed: docId2});

            // Stop second handle. Nothing should happen, but the multiplexer should
            // be stopped.
            test.isTrue(observeMultiplexer._handles);  // This will change.
            o2.handle.stop();
            test.length(o1.output, 0);
            test.length(o2.output, 0);
            // White-box: ObserveMultiplexer has nulled its _handles so you can't
            // accidentally join to it.
            test.isNull(observeMultiplexer._handles);

            // Start yet another handle on the same query.
            var o3 = observer();
            // Initial adds.
            test.length(o3.output, 2);
            test.include([docId1, docId2], o3.output[0].added);
            test.include([docId1, docId2], o3.output[1].added);
            test.notEqual(o3.output[0].added, o3.output[1].added);
            // Old observers not called.
            test.length(o1.output, 0);
            test.length(o2.output, 0);
            // White-box: Different ObserveMultiplexer.
            test.isTrue(observeMultiplexer !== o3.handle._multiplexer);

            // Start another handle with no added callback. Regression test for #589.
            var o4 = observer(true);

            o3.handle.stop();
            o4.handle.stop();

            onComplete();
        });

        Tinytest.addAsync('UniCollection - async server-side insert, ' + idGeneration, function (test, onComplete) {
            // Tests that insert returns before the callback runs. Relies on the fact
            // that mongo does not run the callback before spinning off the event loop.
            var cname = Random.id();
            var coll = new UniCollection(cname);
            var doc = {foo: 'bar'};
            var x = 0;
            coll.insert(doc, function (err) {
                test.equal(err, null);
                test.equal(x, 1);
                onComplete();
            });
            x++;
        });

        Tinytest.addAsync('UniCollection - async server-side update, ' + idGeneration, function (test, onComplete) {
            // Tests that update returns before the callback runs.
            var cname = Random.id();
            var coll = new UniCollection(cname);
            var doc = {foo: 'bar'};
            var x = 0;
            var id = coll.insert(doc);
            coll.update(id, {$set: {foo: 'baz'}}, function (err, result) {
                test.equal(err, null);
                test.equal(result, 1);
                test.equal(x, 1);
                onComplete();
            });
            x++;
        });

        Tinytest.addAsync('UniCollection - async server-side remove, ' + idGeneration, function (test, onComplete) {
            // Tests that remove returns before the callback runs.
            var cname = Random.id();
            var coll = new UniCollection(cname);
            var doc = {foo: 'bar'};
            var x = 0;
            var id = coll.insert(doc);
            coll.remove(id, function (err) {
                test.equal(err, null);
                test.isFalse(coll.findOne(id));
                test.equal(x, 1);
                onComplete();
            });
            x++;
        });
    }

    testAsyncMulti('UniCollection - empty documents, ' + idGeneration, [
        function (test, expect) {
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {
            var coll = new UniCollection(this.collectionName, collectionOptions);

            coll.insert({}, expect(function (err, id) {
                test.isFalse(err);
                test.isTrue(id);
                var cursor = coll.find();
                test.equal(cursor.count(), 1);
            }));
        }
    ]);

// Regression test for #2413.
    testAsyncMulti('UniCollection - upsert without callback, ' + idGeneration, [
        function (test, expect) {
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {
            var coll = new UniCollection(this.collectionName, collectionOptions);

            // No callback!  Before fixing #2413, this method never returned and
            // so no future DDP methods worked either.
            coll.upsert('foo', {bar: 1});
            // Do something else on the same method and expect it to actually work.
            // (If the bug comes back, this will 'async batch timeout'.)
            coll.insert({}, expect(function () {
            }));
        }
    ]);

// See https://github.com/meteor/meteor/issues/594.
    testAsyncMulti('UniCollection - document with length, ' + idGeneration, [
        function (test, expect) {
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName, collectionOptions);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {
            var self = this;
            var coll = self.coll = new UniCollection(self.collectionName, collectionOptions);

            coll.insert({foo: 'x', length: 0}, expect(function (err, id) {
                test.isFalse(err);
                test.isTrue(id);
                self.docId = id;
                checkDocument(test, coll.findOne(self.docId), {_id: self.docId, foo: 'x', length: 0});

            }));
        },
        function (test, expect) {
            var self = this;
            var coll = self.coll;
            coll.update(self.docId, {$set: {length: 5}}, expect(function (err) {
                test.isFalse(err);
                checkDocument(test, coll.findOne(self.docId), {_id: self.docId, foo: 'x', length: 5});
            }));
        }
    ]);

    testAsyncMulti('UniCollection - document with a date, ' + idGeneration, [
        function (test, expect) {
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName, collectionOptions);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {

            var coll = new UniCollection(this.collectionName, collectionOptions);
            coll.insert({d: new Date(1356152390004)}, expect(function (err, id) {
                test.isFalse(err);
                test.isTrue(id);
                var cursor = coll.find();
                test.equal(cursor.count(), 1);
                test.equal(coll.findOne().d.getFullYear(), 2012);
            }));
        }
    ]);

    var bin = Base64.decode(
        'TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyBy' +
        'ZWFzb24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJv' +
        'bSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhl' +
        'IG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdo' +
        'dCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdl' +
        'bmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9y' +
        'dCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=');

    testAsyncMulti('UniCollection - document with binary data, ' + idGeneration, [
        function (test, expect) {
            // XXX probably shouldn't use EJSON's private test symbols
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName, collectionOptions);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {
            var coll = new UniCollection(this.collectionName, collectionOptions);
            coll.insert({b: bin}, expect(function (err, id) {
                test.isFalse(err);
                test.isTrue(id);
                var cursor = coll.find();
                test.equal(cursor.count(), 1);
                var inColl = coll.findOne();
                test.isTrue(EJSON.isBinary(inColl.b));
                test.equal(inColl.b, bin);
            }));
        }
    ]);

    testAsyncMulti('UniCollection - document with a custom type, ' + idGeneration, [
        function (test, expect) {
            this.collectionName = Random.id();
            if (Meteor.isClient) {
                Meteor.call('createInsecureCollection', this.collectionName, collectionOptions);
                Meteor.subscribe('c-' + this.collectionName, expect());
            }
        }, function (test, expect) {
            var self = this;
            self.coll = new UniCollection(this.collectionName, collectionOptions);
            var docId;
            // Dog is implemented at the top of the file, outside of the idGeneration
            // loop (so that we only call EJSON.addType once).
            var d = new Dog('reginald', 'purple');
            self.coll.insert({d: d}, expect(function (err, id) {
                test.isFalse(err);
                test.isTrue(id);
                docId = id;
                self.docId = docId;
                var cursor = self.coll.find();
                test.equal(cursor.count(), 1);
                var inColl = self.coll.findOne();
                test.isTrue(inColl);
                inColl && test.equal(inColl.d.speak(), 'woof');
            }));
        }, function (test, expect) {
            var self = this;
            self.coll.insert(new Dog('rover', 'orange'), expect(function (err, id) {
                test.isTrue(err);
                test.isFalse(id);
            }));
        }, function (test, expect) {
            var self = this;
            self.coll.update(
                self.docId, new Dog('rover', 'orange'), expect(function (err) {
                    test.isTrue(err);
                }));
        }
    ]);

    if (Meteor.isServer) {
        Tinytest.addAsync('UniCollection - update return values, ' + idGeneration, function (test, onComplete) {
            var run = test.runId();
            var coll = new UniCollection('livedata_update_result_' + run, collectionOptions);

            coll.insert({foo: 'bar'});
            coll.insert({foo: 'baz'});
            test.equal(coll.update({}, {$set: {foo: 'qux'}}, {multi: true}),
                2);
            coll.update({}, {$set: {foo: 'quux'}}, {multi: true}, function (err, result) {
                test.isFalse(err);
                test.equal(result, 2);
                onComplete();
            });
        });

        Tinytest.addAsync('UniCollection - remove return values, ' + idGeneration, function (test, onComplete) {
            var run = test.runId();
            var coll = new UniCollection('livedata_update_result_' + run, collectionOptions);

            coll.insert({foo: 'bar'});
            coll.insert({foo: 'baz'});
            test.equal(coll.remove({}), 2);
            coll.insert({foo: 'bar'});
            coll.insert({foo: 'baz'});
            coll.remove({}, function (err, result) {
                test.isFalse(err);
                test.equal(result, 2);
                onComplete();
            });
        });


        Tinytest.addAsync('UniCollection - id-based invalidation, ' + idGeneration, function (test, onComplete) {
            var run = test.runId();
            var coll = new UniCollection('livedata_invalidation_collection_' + run, collectionOptions);

            coll.allow({
                update: function () {
                    return true;
                },
                remove: function () {
                    return true;
                }
            });

            var id1 = coll.insert({x: 42, is1: true});
            var id2 = coll.insert({x: 50, is2: true});

            var polls = {};
            var handlesToStop = [];
            var observe = function (name, query) {
                var handle = coll.find(query).observeChanges({
                    // Make sure that we only poll on invalidation, not due to time, and
                    // keep track of when we do. Note: this option disables the use of
                    // oplogs (which admittedly is somewhat irrelevant to this feature).
                    _testOnlyPollCallback: function () {
                        polls[name] = (name in polls ? polls[name] + 1 : 1);
                    }
                });
                handlesToStop.push(handle);
            };

            observe('all', {});
            observe('id1Direct', id1);
            observe('id1InQuery', {_id: id1, z: null});
            observe('id2Direct', id2);
            observe('id2InQuery', {_id: id2, z: null});
            observe('bothIds', {_id: {$in: [id1, id2]}});

            var resetPollsAndRunInFence = function (f) {
                polls = {};
                runInFence(f);
            };

            // Update id1 directly. This should poll all but the 'id2' queries. 'all'
            // and 'bothIds' increment by 2 because they are looking at both.
            resetPollsAndRunInFence(function () {
                coll.update(id1, {$inc: {x: 1}});
            });
            test.equal(
                polls,
                {all: 1, id1Direct: 1, id1InQuery: 1, bothIds: 1});

            // Update id2 using a funny query. This should poll all but the 'id1'
            // queries.
            resetPollsAndRunInFence(function () {
                coll.update({_id: id2, q: null}, {$inc: {x: 1}});
            });
            test.equal(
                polls,
                {all: 1, id2Direct: 1, id2InQuery: 1, bothIds: 1});

            // Update both using a $in query. Should poll each of them exactly once.
            resetPollsAndRunInFence(function () {
                coll.update({_id: {$in: [id1, id2]}, q: null}, {$inc: {x: 1}});
            });
            test.equal(
                polls,
                {
                    all: 1, id1Direct: 1, id1InQuery: 1, id2Direct: 1, id2InQuery: 1,
                    bothIds: 1
                });

            _.each(handlesToStop, function (h) {
                h.stop();
            });
            onComplete();
        });

        Tinytest.add('UniCollection - upsert error parse, ' + idGeneration, function (test) {
            var run = test.runId();
            var coll = new UniCollection('livedata_upsert_errorparse_collection_' + run, collectionOptions);

            coll.insert({_id: 'foobar'});
            var err;
            try {
                coll.update({_id: 'foobar'}, {_id: 'cowbar'});
            } catch (e) {
                err = e;
            }
            test.isTrue(err);

            try {
                coll.insert({_id: 'foobar'});
            } catch (e) {
                err = e;
            }
            test.isTrue(err);
        });

    } // end Meteor.isServer

    if (Meteor.isClient) {
        Tinytest.addAsync('UniCollection - async update/remove return values over network ' + idGeneration, function (test, onComplete) {
            var coll;
            var run = test.runId();
            var collName = 'livedata_upsert_collection_' + run;
            Meteor.call('createInsecureCollection', collName, collectionOptions);
            coll = new UniCollection(collName, collectionOptions);
            Meteor.subscribe('c-' + collName, function () {
                coll.insert({_id: 'foo'});
                coll.insert({_id: 'bar'});
                coll.update({_id: 'foo'}, {$set: {foo: 1}}, {multi: true}, function (err, result) {
                    test.isFalse(err);
                    test.equal(result, 1);
                    coll.update({_id: 'foo'}, {$set: {foo: 2}}, function (err, result) {
                        test.isFalse(err);
                        test.equal(result, 1);
                        coll.update({_id: 'baz'}, {$set: {foo: 1}}, function (err, result) {
                            test.isFalse(err);
                            test.equal(result, 0);
                            coll.remove({_id: 'foo'}, function (err, result) {
                                test.equal(result, 1);
                                coll.remove({_id: 'baz'}, function (err, result) {
                                    test.equal(result, 0);
                                    onComplete();
                                });
                            });
                        });
                    });
                });
            });
        });

        Tinytest.addAsync('UniCollection - async update/remove return values over network by doc ' + idGeneration, function (test, onComplete) {
            var coll;
            var run = test.runId();
            var collName = 'livedata_upsert_collection_' + run;
            Meteor.call('createInsecureCollection', collName, collectionOptions);
            coll = new UniCollection(collName, collectionOptions);
            for (let i = 0; i < 10; i++) {
                coll.insert({z: i});
            }

            Meteor.subscribe('c-' + collName, function () {
                coll.find().forEach((d) => {
                    d.update({$set: {z: 1}});
                });
                Meteor.setTimeout(() => {
                    coll.find().forEach((d) => {
                        test.isTrue(d.z === 1);
                    });
                    onComplete();
                }, 1000);
            });
        });
    }

// Runs a method and its stub which do some upserts. The method throws an error
// if we don't get the right return values.
    if (Meteor.isClient) {
        _.each([true, false], function (useUpdate) {
            Tinytest.addAsync('UniCollection - ' + (useUpdate ? 'update ' : '') + 'upsert in method, ' + idGeneration, function (test, onComplete) {
                var run = test.runId();
                upsertTestMethodColl = new UniCollection(upsertTestMethod + '_collection_' + run, collectionOptions);
                var m = {};
                delete Meteor.connection._methodHandlers[upsertTestMethod];
                m[upsertTestMethod] = function (run, useUpdate /*, options*/) {
                    upsertTestMethodImpl(upsertTestMethodColl, useUpdate, test);
                };
                Meteor.methods(m);
                Meteor.call(upsertTestMethod, run, useUpdate, collectionOptions, function (err) {
                    test.isFalse(err);
                    onComplete();
                });
            });
        });
    }

});  // end idGeneration parametrization

Tinytest.addAsync('UniCollection - create not saved document ', function (test, onComplete) {
    var run = test.runId();
    var coll;
    if (Meteor.isClient) {
        coll = new UniCollection('abc', {connection: null}); // local
    } else {
        coll = new UniCollection('create_test_collection_' + run);
    }
    test.isTrue(coll.create() instanceof UniCollection.UniDoc);
    onComplete();
});

testAsyncMulti('UniCollection - create and saved document ', [
    function (test, expect) {
        var run = test.runId();
        if (Meteor.isClient) {
            this.collectionName = 'cr_' + Random.id() + '_' + run;
            Meteor.call('createInsecureCollection', this.collectionName);
            this.coll = new UniCollection(this.collectionName);
            Meteor.subscribe('c-' + this.collectionName, expect());
        } else {
            this.collectionName = 'cr_' + Random.id() + '_' + run;
            this.coll = new UniCollection(this.collectionName);
            expect()();
        }
    },
    function (test, expect) {
        var doc = this.coll.create({bestDev: 'rabani'}, {
            callback: expect((err, res) => {
                test.isFalse(!!err);
                test.equal(doc, res);
            }), save: true
        });
        test.isTrue(!!doc.getCollectionName());
    }
]);

// Consistent id generation tests
function collectionInsert (test, expect, coll /*, index*/) {
    var clientSideId = coll.insert({name: 'foo'}, expect(function (err1, id) {
        test.equal(id, clientSideId);
        var o = coll.findOne(id);
        test.isTrue(_.isObject(o));
        test.equal(o.name, 'foo');
    }));
}

function functionCallsInsert (test, expect, coll, index) {
    Meteor.call('insertObjects', coll._name, {name: 'foo'}, 1, expect(function (err1, ids) {
        test.notEqual((INSERTED_IDS[coll._name] || []).length, 0);
        var stubId = INSERTED_IDS[coll._name][index];

        test.equal(ids.length, 1);
        test.equal(ids[0], stubId);

        var o = coll.findOne(stubId);
        test.isTrue(_.isObject(o));
        test.equal(o.name, 'foo');
    }));
}

function functionCalls3Inserts (test, expect, coll, index) {
    Meteor.call('insertObjects', coll._name, {name: 'foo'}, 3, expect(function (err1, ids) {
        test.notEqual((INSERTED_IDS[coll._name] || []).length, 0);
        test.equal(ids.length, 3);

        for (var i = 0; i < 3; i++) {
            var stubId = INSERTED_IDS[coll._name][(3 * index) + i];
            test.equal(ids[i], stubId);

            var o = coll.findOne(stubId);
            test.isTrue(_.isObject(o));
            test.equal(o.name, 'foo');
        }
    }));
}

function functionChainInsert (test, expect, coll, index) {
    Meteor.call('doMeteorCall', 'insertObjects', coll._name, {name: 'foo'}, 1, expect(function (err1, ids) {
        test.notEqual((INSERTED_IDS[coll._name] || []).length, 0);
        var stubId = INSERTED_IDS[coll._name][index];

        test.equal(ids.length, 1);
        test.equal(ids[0], stubId);

        var o = coll.findOne(stubId);
        test.isTrue(_.isObject(o));
        test.equal(o.name, 'foo');
    }));
}

function functionChain2Insert (test, expect, coll, index) {
    Meteor.call('doMeteorCall', 'doMeteorCall', 'insertObjects', coll._name, {name: 'foo'}, 1, expect(function (err1, ids) {
        test.notEqual((INSERTED_IDS[coll._name] || []).length, 0);
        var stubId = INSERTED_IDS[coll._name][index];

        test.equal(ids.length, 1);
        test.equal(ids[0], stubId);

        var o = coll.findOne(stubId);
        test.isTrue(_.isObject(o));
        test.equal(o.name, 'foo');
    }));
}


_.each({
    collectionInsert: collectionInsert,
    functionCallsInsert: functionCallsInsert,
    functionCalls3Insert: functionCalls3Inserts,
    functionChainInsert: functionChainInsert,
    functionChain2Insert: functionChain2Insert
}, function (fn, name) {
    _.each([1, 3], function (repetitions) {
        _.each([1, 3], function (collectionCount) {
            _.each(['STRING', 'MONGO'], function (idGeneration) {

                testAsyncMulti('UniCollection - consistent _id generation ' + name + ', ' + repetitions + ' repetitions on ' + collectionCount + ' collections, idGeneration=' + idGeneration, [function (test, expect) {
                    var collectionOptions = {idGeneration: idGeneration};

                    var cleanups = this.cleanups = [];
                    this.collections = _.times(collectionCount, function () {
                        var collectionName = 'consistentid_' + Random.id();
                        if (Meteor.isClient) {
                            Meteor.call('createInsecureCollection', collectionName, collectionOptions);
                            Meteor.subscribe('c-' + collectionName, expect());
                            cleanups.push(function (expect) {
                                Meteor.call('dropInsecureCollection', collectionName, expect(function () {
                                }));
                            });
                        }

                        var collection = new UniCollection(collectionName, collectionOptions);
                        if (Meteor.isServer) {
                            cleanups.push(function () {
                                collection._dropCollection();
                            });
                        }
                        COLLECTIONS[collectionName] = collection;
                        return collection;
                    });
                }, function (test, expect) {
                    // now run the actual test
                    for (var i = 0; i < repetitions; i++) {
                        for (var j = 0; j < collectionCount; j++) {
                            fn(test, expect, this.collections[j], i);
                        }
                    }
                }, function (test, expect) {
                    // Run any registered cleanup functions (e.g. to drop collections)
                    _.each(this.cleanups, function (cleanup) {
                        cleanup(expect);
                    });
                }]);

            });
        });
    });
});


testAsyncMulti('UniCollection - empty string _id', [
    function (test, expect) {
        var self = this;
        self.collectionName = Random.id();
        if (Meteor.isClient) {
            Meteor.call('createInsecureCollection', self.collectionName);
            Meteor.subscribe('c-' + self.collectionName, expect());
        }
        self.coll = new UniCollection(self.collectionName);
        try {
            self.coll.insert({_id: '', f: 'foo'});
            test.fail('Insert with an empty _id should fail');
        } catch (e) {
            // ok
        }
        self.coll.insert({_id: 'realid', f: 'bar'}, expect(function (err, res) {
            test.equal(res, 'realid');
        }));
    },
    function (test, expect) {
        var self = this;
        var docs = self.coll.find().fetch();
        test.equal(docs, [self.coll.create({_id: 'realid', f: 'bar'})]);
        expect()();
    },
    function (test, expect) {
        var self = this;
        if (Meteor.isServer) {
            self.coll._collection.insert({_id: '', f: 'baz'});
            test.equal(self.coll.find().fetch().length, 2);
        }
        expect()();
    }
]);

Tinytest.addAsync('UniCollection - local collections with different connections', function (test, onComplete) {
    var cname = Random.id();
    var cname2 = Random.id();
    var coll1 = new UniCollection(cname);
    var doc = {foo: 'bar'};
    var coll2 = new UniCollection(cname2, {connection: null});
    coll2.insert(doc, function () {
        test.equal(coll1.find(doc).count(), 0);
        test.equal(coll2.find(doc).count(), 1);
        onComplete();
    });
});

Tinytest.addAsync('UniCollection - local collection with null connection, w/ callback', function (test, onComplete) {
    var cname = Random.id();
    var coll1 = new UniCollection(cname, {connection: null});
    var doc = {foo: 'bar'};
    var docId = coll1.insert(doc, function (err, id) {
        test.equal(docId, id);
        test.equal(coll1.findOne(doc)._id, id);
        onComplete();
    });
});

Tinytest.addAsync('UniCollection - local collection with null connection, w/o callback', function (test, onComplete) {
    var cname = Random.id();
    var coll1 = new UniCollection(cname, {connection: null});
    var doc = {foo: 'bar'};
    var docId = coll1.insert(doc);
    test.equal(coll1.findOne(doc)._id, docId);
    onComplete();
});

testAsyncMulti('UniCollection - update handles $push with $each correctly', [
    function (test, expect) {
        var self = this;
        var collectionName = Random.id();
        if (Meteor.isClient) {
            Meteor.call('createInsecureCollection', collectionName);
            Meteor.subscribe('c-' + collectionName, expect());
        }

        self.collection = new UniCollection(collectionName);

        self.id = self.collection.insert(
            {name: 'jens', elements: ['X', 'Y']}, expect(function (err, res) {
                test.isFalse(err);
                test.equal(self.id, res);
            }));
    },
    function (test, expect) {
        var self = this;
        self.collection.update(self.id, {
            $push: {
                elements: {
                    $each: ['A', 'B', 'C'],
                    $slice: -4
                }
            }
        }, expect(function (err) {
            test.isFalse(err);
            checkDocument(
                test,
                self.collection.findOne(self.id),
                {_id: self.id, name: 'jens', elements: ['Y', 'A', 'B', 'C']});
        }));
    }
]);

if (Meteor.isServer) {
    Tinytest.add('UniCollection - upsert handles $push with $each correctly', function (test) {
        var collection = new UniCollection(Random.id());

        var result = collection.upsert(
            {name: 'jens'},
            {
                $push: {
                    elements: {
                        $each: ['A', 'B', 'C'],
                        $slice: -4
                    }
                }
            });

        test.equal(collection.findOne(result.insertedId),
            collection.create({
                _id: result.insertedId,
                name: 'jens',
                elements: ['A', 'B', 'C']
            }));

        var id = collection.insert({name: 'david', elements: ['X', 'Y']});
        result = collection.upsert(
            {name: 'david'},
            {
                $push: {
                    elements: {
                        $each: ['A', 'B', 'C'],
                        $slice: -4
                    }
                }
            });

        test.equal(collection.findOne(id),
            collection.create({
                _id: id,
                name: 'david',
                elements: ['Y', 'A', 'B', 'C']
            }));
    });

    Tinytest.add('UniCollection - upsert handles dotted selectors corrrectly', function (test) {
        var collection = new UniCollection(Random.id());

        var result1 = collection.upsert({
            'subdocument.a': 1
        }, {
            $set: {message: 'upsert 1'}
        });

        test.equal(collection.findOne(result1.insertedId), collection.create({
            _id: result1.insertedId,
            subdocument: {a: 1},
            message: 'upsert 1'
        }));

        var result2 = collection.upsert({
            'subdocument.a': 1
        }, {
            $set: {message: 'upsert 2'}
        });

        test.equal(result2, {numberAffected: 1});

        test.equal(collection.findOne(result1.insertedId), collection.create({
            _id: result1.insertedId,
            subdocument: {a: 1},
            message: 'upsert 2'
        }));

        var result3 = collection.upsert({
            'subdocument.a.b': 1,
            'subdocument.c': 2
        }, {
            $set: {message: 'upsert3'}
        });

        test.equal(collection.findOne(result3.insertedId), collection.create({
            _id: result3.insertedId,
            subdocument: {a: {b: 1}, c: 2},
            message: 'upsert3'
        }));

        var result4 = collection.upsert({
            'subdocument.a': 4
        }, {
            $set: {'subdocument.a': 'upsert 4'}
        });

        test.equal(collection.findOne(result4.insertedId), collection.create({
            _id: result4.insertedId,
            subdocument: {a: 'upsert 4'}
        }));

        var result5 = collection.upsert({
            'subdocument.a': 'upsert 4'
        }, {
            $set: {'subdocument.a': 'upsert 5'}
        });

        test.equal(result5, {numberAffected: 1});

        test.equal(collection.findOne(result4.insertedId), collection.create({
            _id: result4.insertedId,
            subdocument: {a: 'upsert 5'}
        }));

        var result6 = collection.upsert({
            'subdocument.a': 'upsert 5'
        }, {
            $set: {'subdocument': 'upsert 6'}
        });

        test.equal(result6, {numberAffected: 1});

        test.equal(collection.findOne(result4.insertedId), collection.create({
            _id: result4.insertedId,
            subdocument: 'upsert 6'
        }));

        var result7 = collection.upsert({
            'subdocument.a.b': 7
        }, {
            $set: {
                'subdocument.a.c': 'upsert7'
            }
        });

        test.equal(collection.findOne(result7.insertedId), collection.create({
            _id: result7.insertedId,
            subdocument: {
                a: {b: 7, c: 'upsert7'}
            }
        }));

        var result8 = collection.upsert({
            'subdocument.a.b': 7
        }, {
            $set: {
                'subdocument.a.c': 'upsert8'
            }
        });

        test.equal(result8, {numberAffected: 1});

        test.equal(collection.findOne(result7.insertedId), collection.create({
            _id: result7.insertedId,
            subdocument: {
                a: {b: 7, c: 'upsert8'}
            }
        }));

        var result9 = collection.upsert({
            'subdocument.a.b': 7
        }, {
            $set: {
                'subdocument.a.b': 'upsert9'
            }
        });

        test.equal(result9, {numberAffected: 1});

        test.equal(collection.findOne(result7.insertedId), collection.create({
            _id: result7.insertedId,
            subdocument: {
                a: {b: 'upsert9', c: 'upsert8'}
            }
        }));

    });
}


Meteor.isServer && Tinytest.add('UniCollection - cursor dedup stop', function () {
    var coll = new UniCollection(Random.id());
    _.times(100, function () {
        coll.insert({foo: 'baz'});
    });
    var handler = coll.find({}).observeChanges({
        added: function (id) {
            coll.update(id, {$set: {foo: 'bar'}});
        }
    });
    handler.stop();
    // Previously, this would print
    //    Exception in queued task: TypeError: Object.keys called on non-object
    // Unfortunately, this test didn't fail before the bugfix, but it at least
    // would print the error and no longer does.
    // See https://github.com/meteor/meteor/issues/2070
});

testAsyncMulti('UniCollection - undefined find options', [
    function (test, expect) {
        var self = this;
        self.collName = Random.id();
        if (Meteor.isClient) {
            Meteor.call('createInsecureCollection', self.collName);
            Meteor.subscribe('c-' + self.collName, expect());
        }
    },
    function (test, expect) {
        var self = this;
        self.coll = new UniCollection(self.collName);
        self.doc = {foo: 1, bar: 2, _id: 'foobar'};
        self.coll.insert(self.doc, expect(function (err) {
            test.isFalse(err);
        }));
    },
    function (test, expect) {
        var self = this;
        var result = self.coll.findOne({foo: 1}, {
            fields: undefined,
            sort: undefined,
            limit: undefined,
            skip: undefined
        });
        checkDocument(test, result, self.doc);
        expect()();
    }
]);

// Regression test for #2274.
Meteor.isServer && testAsyncMulti('UniCollection - observe limit bug', [
    function (test, expect) {
        var self = this;
        self.coll = new UniCollection(Random.id());
        var state = {};
        var callbacks = {
            changed: function (newDoc) {
                state[newDoc._id] = newDoc;
            },
            added: function (newDoc) {
                state[newDoc._id] = newDoc;
            },
            removed: function (oldDoc) {
                delete state[oldDoc._id];
            }
        };
        self.observe = self.coll.find(
            {}, {limit: 1, sort: {sortField: -1}}).observe(callbacks);

        // Insert some documents.
        runInFence(function () {
            self.id0 = self.coll.insert({sortField: 0, toDelete: true});
            self.id1 = self.coll.insert({sortField: 1, toDelete: true});
            self.id2 = self.coll.insert({sortField: 2, toDelete: true});
        });
        test.equal(_.keys(state), [self.id2]);

        // Mutate the one in the unpublished buffer and the one below the
        // buffer. Before the fix for #2274, this left the observe state machine in
        // a broken state where the buffer was empty but it wasn't try to re-fill
        // it.
        runInFence(function () {
            self.coll.update({_id: {$ne: self.id2}},
                {$set: {toDelete: false}},
                {multi: 1});
        });
        test.equal(_.keys(state), [self.id2]);

        // Now remove the one published document. This should slide up id1 from the
        // buffer, but this didn't work before the #2274 fix.
        runInFence(function () {
            self.coll.remove({toDelete: true});
        });
        test.equal(_.keys(state), [self.id1]);

        expect()();
    }
]);

Meteor.isServer && testAsyncMulti('UniCollection - update with replace forbidden', [
    function (test, expect) {
        var c = new UniCollection(Random.id());

        var id = c.insert({foo: 'bar'});

        c.update(id, {foo2: 'bar2'});
        checkDocument(test, c.findOne(id), {_id: id, foo2: 'bar2'});

        test.throws(function () {
            c.update(id, {foo3: 'bar3'}, {_forbidReplace: true});
        }, 'Replacements are forbidden');
        checkDocument(test, c.findOne(id), {_id: id, foo2: 'bar2'});

        test.throws(function () {
            c.update(id, {foo3: 'bar3', $set: {blah: 1}});
        }, 'cannot have both modifier and non-modifier fields');
        checkDocument(test, c.findOne(id), {_id: id, foo2: 'bar2'});

        expect()();
    }
]);

if (Meteor.isServer) {
    Tinytest.add('UniCollection - update/remove don\'t accept an array as a selector #4804', function (test) {
        var collection = new UniCollection(Random.id());

        _.times(10, function () {
            collection.insert({data: 'Hello'});
        });

        test.equal(collection.find().count(), 10);

        // Test several array-related selectors
        _.each([[], [1, 2, 3], [{}]], function (selector) {
            test.throws(function () {
                collection.remove(selector);
            });

            test.throws(function () {
                collection.update(selector, {$set: 5});
            });
        });

        test.equal(collection.find().count(), 10);
    });
}

// This is a regression test for https://github.com/meteor/meteor/issues/4839.
// Prior to fixing the issue (but after applying
// https://github.com/meteor/meteor/pull/4694), doing a Mongo write from a
// timeout that ran after a method body (invoked via the client) would throw an
// error 'fence has already activated -- too late to add a callback' and not
// properly call the Mongo write's callback.  In this test:
//  - The client invokes a method (fenceOnBeforeFireError1) which
//    - Starts an observe on a query
//    - Creates a timeout (which shares a write fence with the method)
//    - Lets the method return (firing the write fence)
//  - The timeout runs and does a Mongo write. This write is inside a write
//    fence (because timeouts preserve the fence, see dcd26415) but the write
//    fence already fired.
//  - The Mongo write's callback confirms that there is no error. This was
//    not the case before fixing the bug!  (Note that the observe was necessary
//    for the error to occur, because the error was thrown from the observe's
//    crossbar listener callback).  It puts the confirmation into a Future.
//  - The client invokes another method which reads the confirmation from
//    the future. (Well, the invocation happened earlier but the use of the
//    Future sequences it so that the confirmation only gets read at this point.)
if (Meteor.isClient) {
    testAsyncMulti('UniCollection - fence onBeforeFire error', [
        function (test, expect) {
            var self = this;
            self.nonce = Random.id();
            Meteor.call('fenceOnBeforeFireError1', self.nonce, expect(function (err) {
                test.isFalse(err);
            }));
        },
        function (test, expect) {
            var self = this;
            Meteor.call('fenceOnBeforeFireError2', self.nonce, expect(
                function (err, success) {
                    test.isFalse(err);
                    test.isTrue(success);
                }
            ));
        }
    ]);
} else {
    var fenceOnBeforeFireErrorCollection = new UniCollection('FOBFE');
    var Future = Npm.require('fibers/future');
    var futuresByNonce = {};
    Meteor.methods({
        fenceOnBeforeFireError1: function (nonce) {
            futuresByNonce[nonce] = new Future;
            var observe = fenceOnBeforeFireErrorCollection.find({nonce: nonce})
                .observeChanges({
                    added: function () {
                    }
                });
            Meteor.setTimeout(function () {
                fenceOnBeforeFireErrorCollection.insert(
                    {nonce: nonce},
                    function (err, result) {
                        var success = !err && result;
                        futuresByNonce[nonce].return(success);
                        observe.stop();
                    }
                );
            }, 10);
        },
        fenceOnBeforeFireError2: function (nonce) {
            try {
                return futuresByNonce[nonce].wait();
            } finally {
                delete futuresByNonce[nonce];
            }
        }
    });
}
