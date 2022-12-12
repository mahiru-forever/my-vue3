import { extend, isObject } from '@vue/shared/src'
import { readonly, reactive } from './reactive'

const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)

const readonlyObj = {
  set(target, key) {
    console.warn(`set on key: "${key}" failed`)
  }
}

export const mutableHandlers = {
  get,
  set
}

export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet
}

export const readonlyHandlers = extend(
  {
    get: readonlyGet
  },
  readonlyObj
)

export const shallowReadonlyHandlers = extend(
  {
    get: shallowReadonlyGet
  },
  readonlyObj
)

// 1.是不是仅读，仅读的属性set时会报异常
// 2.是不是深度

// 拦截获取
function createGetter(isReadonly = false, shallow = false) {
  return function(target, key, receiver /* 代理对象本身 */) {
    // proxy+reflect
    // 后续Object上的方法 会被迁移到Reflect
    // 例如：Reflect.getProptypeof()
    // 以前 target[key] = value 设置值可能会失败，并不会报异常，也没有返回值标识  Reflect方法具备返回值
    const res = Reflect.get(target, key, receiver)

    if (!isReadonly) {
      // 不是只读，收集依赖
    }

    if (shallow) {
      // 浅代理 （值不需要代理，直接返回）
      return res
    }

    // 性能提升
    // vue2是一上来就递归代理
    // vue3是取值是进行代理 代理模式：烂代理
    if (isObject(res)) {
      // 深度代理  对象需要继续被代理
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
// 拦截设置
function createSetter(shallow = false) {
  return function(target, key, value, receiver /* 代理对象本身 */) {
    const result = Reflect.set(target, key, value, receiver)

    return result
  }
}
