import { TrackOpTypes, TriggerOrTypes } from './operators'
import { isArray, isIntegerKey } from '@vue/shared/src'

interface IEffectOptions {
  lazy?: boolean
}

// 将effect变成响应式的effect函数，需要数据变化时重新执行
export function effect(fn, options: IEffectOptions = {}) {
  const effect = createReactiveEffect(fn, options)

  // effect 默认会先执行一次
  if (!options.lazy) {
    effect()
  }

  return effect
}

let uid = 0
let activeEffect // 全局变量，存储当前执行的effect
const effectStack = [] // effect调用栈
function createReactiveEffect(fn, options) {
  const effect = function() {
    // 防止重复入栈 （effect(() => { state.xxx++ })）
    if (effectStack.includes(effect)) {
      return
    }

    try {
      effectStack.push(effect)
      activeEffect = effect
      // 函数执行时取值，触发get方法，进行依赖收集
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }

  effect.id = uid++ // effect标识，用于区分effect （排序等操作）
  effect._isEffect = true // 标识是响应式effect
  effect.raw = fn // 记录原函数
  effect.options = options // 保存配置属性

  return effect
}

// 数据结构
// WeakMap key => { name:'xxx' }  value { map => set }
const targetMap = new WeakMap()

// 给对象的属性进行对应effect函数的收集
export function track(target, type: TrackOpTypes, key: string) {
  // 当前运行的effect
  if (!activeEffect) {
    return
  }

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
  }
}

// 找属性对应的effect去执行
export function trigger(
  target,
  type: TriggerOrTypes,
  key: string,
  value,
  oldValue?
) {
  const depsMap = targetMap.get(target)

  // 如果当前属性没有收集过effect，那么不需要任何操作
  if (!depsMap) {
    return
  }

  // 将所有要执行的effect存到一个新的集合中，最终一次性执行
  const effects = new Set<() => {}>()
  const add = effectsToAdd => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => effects.add(effect))
    }
  }

  // 1.修改的是不是数组长度
  if (key === 'length' && isArray(target)) {
    // 长度有依赖收集
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key > value) {
        // 如果更改的是length属性 or 当前的长度小于收集的索引，那么这个索引也要触发effect重新执行
        // 即改了长度，不光长度要更新，对应的索引也要更新
        add(dep)
      }
    })
  } else {
    //  可能是对象
    if (key !== undefined) {
      // 这里肯定是修改操作，不会是新增（新增的还没有dep）
      add(depsMap.get(key))
    }

    // 修改数组中的某一个索引
    switch (type) {
      case TriggerOrTypes.ADD:
        // 新增数组索引，就触发长度的更新
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get('length'))
        }
        break
    }
  }

  effects.forEach(effect => effect())
}
