const isObject = value => typeof value === 'object' && value !== null;
const isArray = Array.isArray;
const isFunction = value => typeof value === 'function';
const isNumber = value => typeof value === 'number';
const isString = value => typeof value === 'string';
const isIntegerKey = key => parseInt(key) + '' === key;
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key);
const hasChanged = (oldValue, value) => oldValue !== value;
// 合并
const extend = Object.assign;

export { extend, hasChanged, hasOwn, isArray, isFunction, isIntegerKey, isNumber, isObject, isString };
//# sourceMappingURL=shared.esm-bundler.js.map
