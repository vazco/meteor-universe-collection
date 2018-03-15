export function isObject (obj) {
    return obj === Object(obj);
}

export function isFunction (obj) {
    return typeof obj === 'function';
}

export function isString (obj) {
    return typeof obj === 'string';
}

export function times (n, iterator, context) {
    var accum = Array(n);
    let i = 0;
    for (; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
}
