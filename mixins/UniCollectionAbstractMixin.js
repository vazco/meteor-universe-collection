class AbstractMixin {
    constructor() {
        if (typeof this.mount === 'function') {
            throw new TypeError('this.mixinDidMount(collection, options) method must be implemented');
        }
        if (typeof this.name !== 'string') {
            console.warn('Mixin should have name');
        }
    }
}

UniCollection.AbstractMixin = AbstractMixin;

UniCollection.createMixin = (cls) => {
    const UniCollectionMixin = class UniCollectionMixin extends AbstractMixin {};
    UniCollectionMixin.prototype = cls;
    return UniCollectionMixin;
};