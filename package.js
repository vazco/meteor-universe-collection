Package.describe({
    summary: 'Collections with helpers on document, prototyping own classes of doc. Users with helpers. Saving doc',
    name: 'vazco:universe-collection',
    version: '2.0.0',
    git: 'https://github.com/vazco/meteor-universe-collection'
});

Package.onUse(function (api) {
    api.imply('universe:collection@2.0.0');
});
