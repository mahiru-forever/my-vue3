var VueReactivity = (function (exports) {
  'use strict';

  const isObject = value => typeof value === 'object' && value !== null;
  const isArray = Array.isArray;
  const isIntegerKey = key => parseInt(key) + '' === key;
  let hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (target, key) => hasOwnProperty.call(target, key);
  const hasChanged = (oldValue, value) => oldValue !== value;
  // 合并
  const extend = Object.assign;

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
      effects.forEach(effect => effect());
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

  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.shallowRef = shallowRef;
  exports.toRef = toRef;
  exports.toRefs = toRefs;

  return exports;

})({});
//# sourceMappingURL=reactivity.global.js.map
