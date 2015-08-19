Package.describe({
    summary: 'Collections with helpers on document, prototyping own classes of doc. Users with helpers. Saving doc',
    name: 'vazco:universe-collection',
    version: '1.7.6',
    git: 'https://github.com/vazco/meteor-universe-collection'
});

Package.onUse(function (api) {
    api.versionsFrom(['METEOR@1.1.0.3']);
    api.use([
        'ejson',
        'check',
        'underscore',
        'accounts-base',
        'mongo',
        'minimongo',
        'vazco:universe-utilities@1.1.5',
        'aldeed:simple-schema@1.3.2'
    ]);

    api.imply('aldeed:simple-schema');

    api.use(['matb33:collection-hooks@0.7.13', 'insecure@1.0.0'], {weak: true});

    api.addFiles([
        'lib/UniCollection.js',
        'lib/UniCollectionValidators.js',
        'lib/UniCollectionSS.js',
        'lib/UniMethods.js',
        'lib/docPrototypes/UniDoc.js',
        'lib/UniUsers.js',
        'lib/docPrototypes/UniUser.js',
        'lib/BasicSchema.js',
        'lib/UniSecure.js'
    ]);

    api.export([
        'UniCollection',
        'UniUsers'
    ]);
});
