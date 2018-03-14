export function isObject (obj) {
    return obj === Object(obj);
}

export function isFunction (obj) {
    return typeof obj === 'function';
}

export function isString (obj) {
    return typeof obj === 'string';
}
