class UniCollectionAbstractMixin {
    constructor() {
        if (typeof this.mixinDidMount === 'function') {
            throw new TypeError('this.mixinDidMount(collection, options) method must be implemented');
        }
        if (typeof this.name !== 'string') {
            console.warn('Mixin should have name');
        }
    }
}

UniCollection.UniCollectionAbstractMixin = UniCollectionAbstractMixin;

UniCollection.createMixin = (cls) => {
    const UniCollectionMixin = class UniCollectionMixin extends UniCollectionAbstractMixin {};
    UniCollectionMixin.prototype = cls;
    return UniCollectionMixin;
};