'use strict';

class AbstractMixin {
    constructor () {
        if (typeof this.mount !== 'function') {
            throw new TypeError('this.mount(collection, options) method must be implemented');
        }
        if (typeof this.name !== 'string') {
            console.warn('Mixin should have name');
        }
    }
}

UniCollection.AbstractMixin = AbstractMixin;

UniCollection.mixins = {};

UniCollection.createMixin = (cls) => {
    const UniCollectionMixin = class UniCollectionMixin extends AbstractMixin {};
    UniCollectionMixin.prototype = cls;
    return UniCollectionMixin;
};
