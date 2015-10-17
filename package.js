'use strict';

Package.describe({
    summary: 'Collections with helpers on document, prototyping own classes of doc. Users with helpers. Saving doc',
    name: 'universe:collection',
    version: '2.0.0',
    git: 'https://github.com/vazco/meteor-universe-collection'
});

Package.onUse(function (api) {
    api.versionsFrom(['METEOR@1.2.0.1']);
    api.use([
        'ejson',
        'check',
        'ecmascript',
        'underscore',
        'mongo',
        'minimongo',
        'universe:utilities@2.0.4',
        'aldeed:simple-schema@1.3.3'
    ]);

    api.imply('aldeed:simple-schema');

    api.use(['accounts-base'], {weak: true});

    api.addFiles([
        'lib/UniCollection.js',
        'lib/UniCollectionSS.js',
        'lib/UniMethods.js',
        'lib/docPrototypes/UniDoc.js',
        'lib/UniUsers.js',
        'lib/docPrototypes/UniUser.js',
        'lib/BasicSchema.js',
        'lib/UniSecure.js',
        'lib/UniHooks.js'
    ]);

    api.addFiles(['lib/UniPublish.js', 'lib/UniMongoIndexes.js'], 'server');

    api.addFiles([
        'mixins/AbstractMixin.js',
        'mixins/BackupMixin.js',
        'mixins/ShowErrorMixin.js',
        'mixins/PublishAccessMixin.js'
    ]);

    api.export([
        'UniCollection',
        'UniUsers'
    ]);
});

Package.onTest(function (api) {
    api.use(['meteor', 'mongo','minimongo','tinytest', 'underscore', 'test-helpers', 'universe:utilities@2.0.4',
        'ejson', 'random', 'ddp', 'base64', 'ecmascript', 'check', 'universe:collection']);
    api.addFiles('tests/livedata_tests.js', ['client', 'server']);
    api.addFiles('tests/schema_tests.js', ['client', 'server']);
    api.addFiles('tests/methods_tests.js', ['client', 'server']);
    api.addFiles('tests/mhooks_tests.js', ['client', 'server']);
});
