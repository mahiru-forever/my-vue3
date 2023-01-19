import { isFunction } from '@vue/shared/src'
import { effect, track, trigger } from './effect'
import { TrackOpTypes, TriggerOrTypes } from './operators'

// computed => effect({ lazy }) + scheduler + 缓存
// vue2 和 vue3 computed原理不一样
// vue2 =》 让computed依赖的属性记住渲染的watcher

class ComputedRefImpl {
  public _dirty = true
  public _value
  public effect

  constructor(getter, public setter) {
    // 计算属性会产生一个effect
    this.effect = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true
          // 触发收集当前计算属性的effect执行
          trigger(this, TriggerOrTypes.SET, 'value')
        }
      }
    })
  }

  // 计算属性也要收集依赖（vue2计算属性不具备收集依赖能力）
  get value() {
    if (this._dirty) {
      this._value = this.effect()
      this._dirty = false
    }
    // 收集计算属性的value （计算属性也有可能被effect收集）
    track(this, TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newValue) {
    this.setter(newValue)
  }
}

export function computed(getterOrOptions) {
  let getter
  let setter

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
    setter = () => {
      console.warn('computed value must be readonly')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}
