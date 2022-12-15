import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOrTypes } from './operators'
import { hasChanged, isObject, isArray } from '@vue/shared/src'
import { reactive } from './reactive'

// ref 和 reactive 区别
// ref 用的是 defineProperty
// reactive 用的是 Proxy

export function ref(value) {
  // 将普通类型变成一个对象（不是普通类型也可以）
  return createRef(value)
}

export function shallowRef(value) {
  return createRef(value, true)
}

const convert = val => (isObject(val) ? reactive(val) : val)

class RefImpl {
  public _value
  public readonly __v_isRef = true // ref属性标识
  constructor(
    public rawValue /* 这种写法会自动声明+赋值 */,
    public shallow /* 这种写法会自动声明+赋值 */
  ) {
    // shallow 为 true，直接代理最外层
    // shallow 为 false，如果是object就通过reactive处理，否则同true的情况
    this._value = shallow ? rawValue : convert(rawValue)
  }

  // 属性访问器（即defineProperty）
  get value() {
    track(this, TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newValue) {
    if (hasChanged(this.rawValue, newValue)) {
      this.rawValue = newValue
      this._value = newValue
      trigger(this, TriggerOrTypes.SET, 'value', newValue)
    }
  }
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow)
}

class ObjectRefImpl {
  public readonly __v_isRef = true // ref属性标识
  constructor(public target, public key) {}

  get value() {
    return this.target[this.key]
  }
  set value(newValue) {
    this.target[this.key] = newValue
  }
}

// toRef 不进行响应式依赖收集，是不是响应式依赖传入的target
// 将一个对象中的属性变成ref
export function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}

// 将对象/数组里所有属性包装成ref
export function toRefs(target) {
  const ret = isArray(target) ? new Array(target.length) : {}

  for (const key in target) {
    ret[key] = toRef(target, key)
  }

  return ret
}
