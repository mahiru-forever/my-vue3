const nodeOps = {
    // 不同的平台创建元素的方式不同
    /** 元素 */
    // 增加
    createElement: tagName => document.createElement(tagName),
    // 删除
    remove: child => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    // 插入
    insert: (child, parent, anchor = null) => {
        parent.insertBefore(child, anchor); // anchor为null相当于appendChild
    },
    // 查找
    querySelector: selector => document.querySelector(selector),
    // 设置文本
    setElementText: (el, text) => (el.textContent = text),
    /** 文本操作 */
    // 创建文本
    createText: text => document.createTextNode(text),
    // 设置文本
    setText: (node, text) => (node.nodeValue = text)
};

const patchAttr = (el, key, value) => {
    if (value === null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
};

const patchClass = (el, next) => {
    if (next === null) {
        el.className = '';
    }
    el.className = next;
};

const patchEvent = (el, key, next) => {
    // 对函数缓存
    const invokers = el._vel || (el._vel = {});
    const exists = invokers[key];
    if (next && exists) {
        // 需要绑定事件，且就旧事件的情况
        // 只改value提高性能
        exists.value = next;
    }
    else {
        const eventName = key.slice(2).toLowerCase();
        if (next) {
            // 绑定事件，且以前没有绑定过
            const invoker = (invokers[key] = createInvoker(next));
            el.addEventListener(eventName, invoker);
        }
        else {
            // 以前绑定了，现在没有事件
            el.removeEventListener(eventName, exists);
            invokers[key] = undefined;
        }
    }
};
function createInvoker(fn) {
    const invoker = e => {
        invoker.value(e);
    };
    invoker.value = fn; // 方便随时更改value属性（用户定义事件）
    return invoker;
}

const patchStyle = (el, prev, next) => {
    const style = el.style;
    if (next === null) {
        el.removeAttribute('style');
    }
    else {
        // 老的里有，新的没有，需要删除
        for (const key in prev) {
            if (!next[key]) {
                style[key] = '';
            }
        }
        // 新的值
        for (const key in next) {
            style[key] = next[key];
        }
    }
};

// 属性操作
const patchProp = (el, key, prevValue, nextValue) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (/^on[^a-z]/.test(key)) {
                patchEvent(el, key, nextValue);
            }
            else {
                patchAttr(el, key, nextValue);
            }
            break;
    }
};

const isObject = value => typeof value === 'object' && value !== null;
const isArray = Array.isArray;
const isFunction = value => typeof value === 'function';
const isString = value => typeof value === 'string';
const isIntegerKey = key => parseInt(key) + '' === key;
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key);
const hasChanged = (oldValue, value) => oldValue !== value;
// 合并
const extend = Object.assign;

function isVnode(vnode) {
    return vnode.__v_isVnode;
}
// createVNode 创建虚拟节点核心流程
// h('div', { style: {color:'red'} }, 'children')  h方法和createApp类似
const createVNode = (type, props, children = null) => {
    // 根据type区分是组件还是普通元素
    const shapeFlag = isString(type)
        ? 1 /* ShapeFlags.ELEMENT */
        : isObject(type)
            ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
            : 0;
    // 描述一个虚拟节点（有跨平台能力）
    const vnode = {
        __v_isVnode: true,
        type,
        props,
        children,
        component: null,
        el: null,
        key: props && props.key,
        shapeFlag
    };
    // 带上子节点的类型
    normalizeChildren(vnode, children);
    return vnode;
};
function normalizeChildren(vnode, children) {
    let type = 0;
    if (children === null) ;
    else if (isArray(children)) {
        type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else {
        type = 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type;
}
const TEXT = Symbol('Text');
function normalizeVNode(child) {
    if (isObject(child)) {
        return child;
    }
    // 文本
    return createVNode(TEXT, null, String(child));
}

function createAppApi(render) {
    return function createApp(rootComponent, rootProps) {
        const app = {
            _props: rootProps,
            _component: rootComponent,
            _container: null,
            // 挂载目的地
            mount(container) {
                // 1.根据组件创建虚拟节点
                const vnode = createVNode(rootComponent, rootProps);
                // 2.将虚拟节点和容器获取到后调用render方法进行渲染
                render(vnode, container);
                app._container = container;
            }
        };
        return app;
    };
}

const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // 取值时 要访问 setUpState props data
        const { setUpState, props, data } = instance;
        if (key[0] === '$') {
            // 不能访问$ 开头的变量
            return;
        }
        if (hasOwn(setUpState, key)) {
            return setUpState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        else if (hasOwn(data, key)) {
            return data[key];
        }
        else {
            return undefined;
        }
    },
    set({ _: instance }, key, value) {
        const { setUpState, props, data } = instance;
        if (hasOwn(setUpState, key)) {
            return (setUpState[key] = value);
        }
        else if (hasOwn(props, key)) {
            return (props[key] = value);
        }
        else if (hasOwn(data, key)) {
            return (data[key] = value);
        }
        else {
            return true;
        }
    }
};

// instance 表示组件的状态（各种状态及组件相关信息）
// context 4个参数，为了开发时使用
// proxy 为了取值方便
function createComponentInstance(vnode) {
    // 组件实例 (组件核心：属性、插槽)
    const instance = {
        vnode,
        type: vnode.type,
        props: {},
        attrs: {},
        slots: {},
        data: {},
        setupState: {},
        ctx: null,
        isMounted: false // 组件是否挂载过
    };
    // 创建一个对象，专门用来做代理
    instance.ctx = { _: instance }; // 通过instance.ctx._ 可以访问instance
    return instance;
}
function setupComponent(instance) {
    const { props, children } = instance.vnode; // { type, props, children }
    // 根据props 解析出 props 和 attrs，将其放到instance上
    instance.props = props; // initProps()
    instance.children = children; // 插槽的解析 initSlot()
    // 当前组件是不是有状态的组件，因为可能是函数组件
    const isStateFul = instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
    if (isStateFul) {
        // 有状态的组件
        // 调用当前实例的setup方法，用setup的返回值，填充setupState和对应的render方法
        setupStatefulComponent(instance);
    }
}
function setupStatefulComponent(instance) {
    // 1.代理 传递给render函数的参数
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    // 2.获取组件的类型 拿到组件的setup方法
    const Component = instance.type; // 用户定义的对象
    const { setup } = Component;
    // ------ 有setup -------
    if (setup) {
        const setupContext = createSetupContent(instance);
        //  setup传入的setupContext和instance不是一个东西，instance里面包含的内容会提取一些传递给context
        const setupResult = setup(instance.props, setupContext); // instance中props attrs slots emit expose会被提取出来，因为开发过程中会用这些属性
        handleSetupResult(instance, setupResult);
    }
    else {
        // ----- 没有setup ------
        finishComponentSetup(instance); // 完成组件的启动
    }
    // Component.render(instance.proxy)
}
// 处理setup的返回值
function handleSetupResult(instance, setupResult) {
    // 判断setup返回值类型
    if (isFunction(setupResult)) {
        // 如果是函数
        instance.render = setupResult;
    }
    else if (isObject(setupResult)) {
        // 如果是对象
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    // instance.render的优先级高于组件的render !!!
    // 即setup的返回值是函数的情况
    if (!instance.render) {
        // 如果没有render
        // 需要对template模版进行编译 产生render函数
        if (!Component.render && Component.template) ;
        // 将生成的render函数挂载在实例上
        instance.render = Component.render;
    }
    // 对vue2 api做兼容性处理
    // applyOptions
    // 循环遍历，将以前的api和现在的做合并
}
function createSetupContent(instance) {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => { },
        expose: () => { }
    };
}

var TrackOpTypes;
(function (TrackOpTypes) {
    TrackOpTypes[TrackOpTypes["GET"] = 0] = "GET";
})(TrackOpTypes || (TrackOpTypes = {}));
var TriggerOrTypes;
(function (TriggerOrTypes) {
    TriggerOrTypes[TriggerOrTypes["ADD"] = 0] = "ADD";
    TriggerOrTypes[TriggerOrTypes["SET"] = 1] = "SET";
})(TriggerOrTypes || (TriggerOrTypes = {}));

// 将effect变成响应式的effect函数，需要数据变化时重新执行
// 1.effect中的属性都会收集effect
// 2.当这个属性发生变化，会重新执行effect
// 3.effect默认立即执行
function effect(fn, options = {}) {
    const effect = createReactiveEffect(fn, options);
    // effect 默认会先执行一次
    if (!options.lazy) {
        effect();
    }
    return effect;
}
let uid = 0;
let activeEffect; // 全局变量，存储当前执行的effect
const effectStack = []; // effect调用栈
function createReactiveEffect(fn, options) {
    const effect = function () {
        // 防止重复入栈 （effect(() => { state.xxx++ })）
        if (effectStack.includes(effect)) {
            return;
        }
        try {
            effectStack.push(effect);
            activeEffect = effect;
            // 函数执行时取值，触发get方法，进行依赖收集
            return fn();
        }
        finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
        }
    };
    effect.id = uid++; // effect标识，用于区分effect （排序等操作）
    effect._isEffect = true; // 标识是响应式effect
    effect.raw = fn; // 记录原函数
    effect.options = options; // 保存配置属性
    return effect;
}
// 数据结构
// WeakMap key => { name:'xxx' }  value { map => set }
const targetMap = new WeakMap();
// 给对象的属性进行对应effect函数的收集
function track(target, type, key) {
    // 当前运行的effect
    if (!activeEffect) {
        return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}
// 找属性对应的effect去执行
function trigger(target, type, key, value, oldValue) {
    const depsMap = targetMap.get(target);
    // 如果当前属性没有收集过effect，那么不需要任何操作
    if (!depsMap) {
        return;
    }
    // 将所有要执行的effect存到一个新的集合中，最终一次性执行
    const effects = new Set();
    const add = effectsToAdd => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => effects.add(effect));
        }
    };
    // 1.修改的是不是数组长度
    if (key === 'length' && isArray(target)) {
        // 长度有依赖收集
        depsMap.forEach((dep, key) => {
            // key === 'length' 数组长度
            // key > value   例如：收集依赖的数组索引为2，但是设置arr.length = 1，那么这个索引为2的也要触发更新
            if (key === 'length' || key > value) {
                // 如果更改的是length属性 or 当前的长度小于收集的索引，那么这个索引也要触发effect重新执行
                // 即改了长度，不光长度要更新，对应的索引也要更新
                add(dep);
            }
        });
    }
    else {
        //  可能是对象
        if (key !== undefined) {
            // 这里肯定是修改操作，不会是新增（新增的还没有dep）
            add(depsMap.get(key));
        }
        // 修改数组中的某一个索引
        switch (type) {
            case TriggerOrTypes.ADD:
                // 新增数组索引，就触发长度的更新
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get('length'));
                }
                break;
        }
    }
    effects.forEach((effect) => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    });
}

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
        if (!isReadonly) {
            // 不是只读，收集依赖
            track(target, TrackOpTypes.GET, key);
        }
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
        const oldValue = target[key]; // 获取老值
        // 是否新增
        let hasKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        const result = Reflect.set(target, key, value, receiver);
        // 数据更新时 通知对应属性的effect重新执行
        // 区分：新增 or 修改
        if (!hasKey) {
            // 新增
            trigger(target, TriggerOrTypes.ADD, key, value);
        }
        else if (hasChanged(oldValue, value)) {
            // 修改
            trigger(target, TriggerOrTypes.SET, key, value);
        }
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

// ref 和 reactive 区别
// ref 用的是 defineProperty
// reactive 用的是 Proxy
function ref(value) {
    // 将普通类型变成一个对象（不是普通类型也可以）
    return createRef(value);
}
function shallowRef(value) {
    return createRef(value, true);
}
const convert = val => (isObject(val) ? reactive(val) : val);
class RefImpl {
    rawValue /* 这种写法会自动声明+赋值 */;
    shallow /* 这种写法会自动声明+赋值 */;
    _value;
    __v_isRef = true; // ref属性标识
    constructor(rawValue /* 这种写法会自动声明+赋值 */, shallow /* 这种写法会自动声明+赋值 */) {
        this.rawValue = rawValue;
        this.shallow = shallow;
        // shallow 为 true，直接代理最外层
        // shallow 为 false，如果是object就通过reactive处理，否则同true的情况
        this._value = shallow ? rawValue : convert(rawValue);
    }
    // 属性访问器（即defineProperty）
    get value() {
        track(this, TrackOpTypes.GET, 'value');
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this.rawValue, newValue)) {
            this.rawValue = newValue;
            this._value = newValue;
            trigger(this, TriggerOrTypes.SET, 'value', newValue);
        }
    }
}
function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow);
}
class ObjectRefImpl {
    target;
    key;
    __v_isRef = true; // ref属性标识
    constructor(target, key) {
        this.target = target;
        this.key = key;
    }
    get value() {
        return this.target[this.key];
    }
    set value(newValue) {
        this.target[this.key] = newValue;
    }
}
// toRef 不进行响应式依赖收集，是不是响应式依赖传入的target
// 将一个对象中的属性变成ref
function toRef(target, key) {
    return new ObjectRefImpl(target, key);
}
// 将对象/数组里所有属性包装成ref
function toRefs(target) {
    const ret = isArray(target) ? new Array(target.length) : {};
    for (const key in target) {
        ret[key] = toRef(target, key);
    }
    return ret;
}

// computed => effect({ lazy }) + scheduler + 缓存
// vue2 和 vue3 computed原理不一样
// vue2 =》 让computed依赖的属性记住渲染的watcher
class ComputedRefImpl {
    setter;
    _dirty = true;
    _value;
    effect;
    constructor(getter, setter) {
        this.setter = setter;
        // 计算属性会产生一个effect
        this.effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true;
                    // 触发收集当前计算属性的effect执行
                    trigger(this, TriggerOrTypes.SET, 'value');
                }
            }
        });
    }
    // 计算属性也要收集依赖（vue2计算属性不具备收集依赖能力）
    get value() {
        if (this._dirty) {
            this._value = this.effect();
            this._dirty = false;
        }
        // 收集计算属性的value （计算属性也有可能被effect收集）
        track(this, TrackOpTypes.GET, 'value');
        return this._value;
    }
    set value(newValue) {
        this.setter(newValue);
    }
}
function computed(getterOrOptions) {
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = () => {
            console.warn('computed value must be readonly');
        };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter);
}

const queue = [];
function queueJob(job) {
    // 多次更新只执行一次
    if (!queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
let isFlushPending = false;
function queueFlush() {
    if (!isFlushPending) {
        isFlushPending = true;
        Promise.resolve().then(flushJobs);
    }
}
function flushJobs() {
    isFlushPending = false;
    // 清空时 需要根据调用的顺序依次更新
    // 更新顺序：从父到子    因为父组件的序号在子组件之前
    // 避免子组件更新之后可能会导致父组件重复刷新
    queue.sort((a, b) => a.id - b.id);
    for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        job();
    }
    queue.length = 0;
}

// 告诉core怎么渲染
// createRenderer 创建渲染器
function createRenderer(rendererOptions) {
    const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText } = rendererOptions;
    // -------- 处理组件方法 ---------
    const setupRenderEffect = (instance, container) => {
        // 需要创建一个effect，在effect中调用render方法，这样render方法中拿到的数据会收集这个effect，属性更新时会重新执行
        // 每个组件都会有一个effect，vue3是组件级更新，数据变化会重新执行对应组件的effect
        instance.update = effect(function componentEffect() {
            if (!instance.isMounted) {
                // 没有被挂载，初次渲染
                const proxyToUse = instance.proxy;
                // 虚拟节点  渲染内容
                // $vnode   _vnode   vue2
                // vnode    subTree  vue3
                const subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse));
                // 用render函数的返回值继续渲染
                patch(null, subTree, container);
                instance.isMounted = true;
            }
        }, {
            scheduler: queueJob
        });
    };
    const mountComponent = (initialVNodel, container) => {
        // 组件的渲染流程
        // 核心：调用setup 拿到返回值，获取render函数返回的结果进行渲染
        // 1.创建组件实例
        const instance = (initialVNodel.component = createComponentInstance(initialVNodel));
        // 2.需要的数据解析到实例上
        setupComponent(instance);
        // 3.创建一个effect，让render函数执行
        setupRenderEffect(instance, container);
    };
    const processComponent = (n1, n2, container) => {
        if (n1 === null) {
            // 组件没有上一次的虚拟节点 ==》 初始化组件
            mountComponent(n2, container);
        }
    };
    // -------- 处理组件方法结束 ---------
    // -------- 处理元素方法 ---------
    const mountChildren = (children, container) => {
        for (let i = 0; i < children.length; i++) {
            // 处理文本的情况（将文本转成虚拟节点(对象的形式)）
            const child = normalizeVNode(children[i]);
            // 挂载到父容器上
            patch(null, child, container);
        }
    };
    // 挂载元素
    // children如果是文本直接给容器设置文本
    // 如果是数组里的文本，则需要创建文本节点插入进父容器
    const mountElement = (vnode, container) => {
        // 递归渲染
        const { props, shapeFlag, type, children } = vnode;
        // 创建真实节点
        const el = (vnode.el = hostCreateElement(type));
        // 设置元素属性
        if (props) {
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]);
            }
        }
        // 处理子节点
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            // 子节点是文本，直接插入即可
            hostSetElementText(el, children);
        }
        else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el);
        }
        // 插入页面
        hostInsert(el, container);
    };
    const processElememt = (n1, n2, container) => {
        if (n1 === null) {
            // 元素挂载（初始化）
            mountElement(n2, container);
        }
    };
    // -------- 处理元素方法结束 ---------
    // -------- 处理文本方法 ---------
    const processText = (n1, n2, container) => {
        if (n1 === null) {
            // 插入
            hostInsert((n2.el = hostCreateText(n2.children)), container);
        }
    };
    // -------- 处理文本方法结束 ---------
    const patch = (n1, n2, container) => {
        // 针对不同类型 做初始化操作
        const { shapeFlag, type } = n2;
        switch (type) {
            // 处理文本
            case TEXT:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 是元素
                    processElememt(n1, n2, container);
                }
                else if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 是组件
                    processComponent(n1, n2, container);
                }
                break;
        }
    };
    // render: core的核心
    const render = (vnode, container) => {
        // 根据不同的虚拟节点，创建对应的真实元素
        // 默认调用render 可能是初始化流程
        patch(null, vnode, container);
    };
    return {
        // 用什么组件和属性来创建应用
        createApp: createAppApi(render)
    };
}

// render函数参数的情况，做兼容处理
// h('div', {})
// h('div', 'hello world')
// h('div', {}, 'hello world')
// h('div', {}, ['p', 'span'])
// h('div', {}, h('p'), h('span'))
// ...
function h(type, propsOrChildren, children) {
    const l = arguments.length;
    if (l === 2) {
        // 类型+属性   类型+children
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            // 是对象 => props or vnode
            if (isVnode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            return createVNode(type, propsOrChildren);
        }
        else {
            // 不是对象 => children
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        // 大于3的都是children
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isObject(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

// domAPI方法
const rendererOptions = extend({ patchProp }, nodeOps);
// 核心方法在runtime-core中
function createApp(rootComponent, rootProps = null) {
    const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps);
    const { mount } = app;
    app.mount = function (container) {
        // 清空操作
        container = nodeOps.querySelector(container);
        container.innerHTML = '';
        // 将组件渲染成dom元素，进行挂载
        mount(container);
    };
    return app;
}
// 用户调用的是runtime-dom -> runtime-core
// runtime-dom是为了解决平台差异（浏览器）

export { computed, createApp, createRenderer, effect, h, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, toRef, toRefs };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
