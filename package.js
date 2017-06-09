'use strict';

Package.describe({
    summary: 'Remote method from doc & collection, helpers on document/user, own doc classes, Multischemas, Hooks',
    name: 'universe:collection',
    version: '2.7.1',
    git: 'https://github.com/vazco/meteor-universe-collection'
});

Package.onUse(function (api) {
    api.versionsFrom(['METEOR@1.3']);

    api.use([
        'ejson',
        'check',
        'random',
        'ecmascript',
        'underscore',
        'mongo',
        'minimongo',
        'universe:utilities@2.3.2',
        'aldeed:simple-schema@1.5.3'
    ]);

    api.imply('aldeed:simple-schema');

    api.use([
        'accounts-base',
        'universe:fixes-for-third-party-packages@0.0.1'
    ], {weak: true});

    api.addFiles([
        'index.js'
    ]);

    api.addFiles([
        'mixins/AbstractMixin.js',
        'mixins/BackupMixin.js',
        'mixins/ShowErrorMixin.js',
        'mixins/PublishAccessMixin.js'
    ]);

    api.addFiles('lib/integrations/problemsDetections.js', 'server');
    api.export([
        'UniCollection',
        'UniUsers',
        'UniDoc',
        'UniUser',
        'BackupMixin',
        'PublishAccessMixin'
    ]);

    api.mainModule('lib/UniCollection.js');
});

Package.onTest(function (api) {
    api.use([
        'meteor',
        'es5-shim',
        'mongo',
        'minimongo',
        'tinytest',
        'underscore',
        'test-helpers',
        'universe:utilities@2.0.6',
        'ejson',
        'random',
        'ddp',
        'base64',
        'ecmascript',
        'check',
        'universe:collection',
        'aldeed:simple-schema@1.3.3'
    ]);
    api.addFiles('tests/livedata_tests.js', ['client', 'server']);
    api.addFiles('tests/schema_tests.js', ['client', 'server']);
    api.addFiles('tests/methods_tests.js', ['client', 'server']);
    api.addFiles('tests/mhooks_tests.js', ['client', 'server']);
});
