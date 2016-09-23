import {UniUtils} from 'meteor/universe:utilities';


let Mingo = null;
UniCollection.prototype.aggregate = function aggregate (pipelines, options) {
    if (!Array.isArray(pipelines) && pipelines.length) {
        throw new Meteor.Error('Expected an non-empty array');
    }
    if (!this._isRemoteCollection()) {
        const coll = this.rawCollection();
        return Meteor.wrapAsync(coll.aggregate.bind(coll))(pipelines, options);
    }
    // Client side
    if (!Mingo) {
        try {
            Mingo = require('mingo');
        } catch (e) {
            throw new Error(
                'Please install mingo package, "npm install --save mingo"\n' +
                'if you want to use aggregation on client side'
            );
        }
    }
    const selector = UniUtils.get(pipelines, '0.$match') || {};

    if (selector) {
        pipelines.shift();
    }

    const docs = this.find(selector, {transform: null}).fetch();

    if (!pipelines.length) {
        return docs;
    }
    return Mingo.aggregate(docs, pipelines);
};

