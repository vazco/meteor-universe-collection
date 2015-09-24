'use strict';

class AbstractMixin {
    constructor (name) {
        if (typeof this.mount !== 'function') {
            throw new TypeError('this.mount(collection, options) method must be implemented');
        }

        this.name = name || this.name;
        if (typeof this.name !== 'string') {
            console.warn('Mixin should have name');
        }
    }
}

UniCollection.AbstractMixin = AbstractMixin;

UniCollection.mixins = {};

UniCollection.createMixin = (cls) => {
    return class UniCollectionMixin extends AbstractMixin {
        constructor () {
            super(cls.name);
            _.extend(this, cls);
        }
    };
};
