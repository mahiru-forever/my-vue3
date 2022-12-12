'use strict';

const isObject = value => typeof value === 'object' && value !== null;
// 合并
const extend = Object.assign;

const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = createSetter(true);
const readonlyObj = {
    set(target, key) {
        console.warn(`set on key: "${key}" failed`);
    }
};
const mutableHandlers = {
    get,
    set
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
const readonlyHandlers = extend({
    get: readonlyGet
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet
}, readonlyObj);
// 1.是不是仅读，仅读的属性set时会报异常
// 2.是不是深度
// 拦截获取
function createGetter(isReadonly = false, shallow = false) {
    return function (target, key, receiver /* 代理对象本身 */) {
        // proxy+reflect
        // 后续Object上的方法 会被迁移到Reflect
        // 例如：Reflect.getProptypeof()
        // 以前 target[key] = value 设置值可能会失败，并不会报异常，也没有返回值标识  Reflect方法具备返回值
        const res = Reflect.get(target, key, receiver);
        if (shallow) {
            // 浅代理 （值不需要代理，直接返回）
            return res;
        }
        // 性能提升
        // vue2是一上来就递归代理
        // vue3是取值是进行代理 代理模式：烂代理
        if (isObject(res)) {
            // 深度代理  对象需要继续被代理
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
// 拦截设置
function createSetter(shallow = false) {
    return function (target, key, value, receiver /* 代理对象本身 */) {
        const result = Reflect.set(target, key, value, receiver);
        return result;
    };
}

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}
// 会自动垃圾回收，不造成内存泄漏，存储的key只能是对象
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
// 仅读？深度？  柯里化  new Proxy() 拦截 get set
function createReactiveObject(target, isReadonly, baseHandlers) {
    // 只有对象才能被拦截
    if (!isObject(target)) {
        return target;
    }
    // 代理过的就不用代理了，直接返回原先的代理
    // 维护两个map，保存 普通响应式 与 只读 （因为响应式也可以标记为只读）
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target);
    if (existProxy) {
        return existProxy; // 已经代理过，直接返回
    }
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy); // 将要代理的对象和代理的结果换成
    return proxy;
}

exports.reactive = reactive;
exports.readonly = readonly;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
//# sourceMappingURL=reactivity.cjs.js.map
