import {
  extend,
  isObject,
  isArray,
  isIntegerKey,
  hasOwn,
  hasChanged
} from '@vue/shared/src'
import { readonly, reactive } from './reactive'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOrTypes } from './operators'

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
      track(target, TrackOpTypes.GET, key)
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
    const oldValue = target[key] // 获取老值

    // 是否新增
    let hasKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)

    const result = Reflect.set(target, key, value, receiver)

    // 数据更新时 通知对应属性的effect重新执行
    // 区分：新增 or 修改
    if (!hasKey) {
      // 新增
      trigger(target, TriggerOrTypes.ADD, key, value)
    } else if (hasChanged(oldValue, value)) {
      // 修改
      trigger(target, TriggerOrTypes.SET, key, value, oldValue)
    }

    return result
  }
}
