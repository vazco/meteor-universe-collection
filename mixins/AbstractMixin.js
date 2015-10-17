'use strict';
let unnamed = 0;

class AbstractMixin {
    constructor (name) {
        if (typeof this.mount !== 'function') {
            throw new TypeError('this.mount(collection, options) method must be implemented');
        }

        this.name = name || this.name;
        if (typeof this.name !== 'string') {
            this.name = '_unnamed_' + ++unnamed;
            Meteor._debug && Meteor._debug('UniCollection mixin should have name, temporally named as:', this.name);
        }
    }
}

UniCollection.AbstractMixin = AbstractMixin;

UniCollection.mixins = {};

UniCollection.createMixinClass = (cls) => {
    check(cls, Object);
    class UniCollectionMixin extends AbstractMixin {}
    Object.keys(cls).forEach((key) => {
        UniCollectionMixin.prototype[key] = cls[key];
    });
    return UniCollectionMixin;
};
