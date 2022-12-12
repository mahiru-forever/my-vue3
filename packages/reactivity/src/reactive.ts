import { isObject } from '@vue/shared'
import {
  mutableHandlers,
  shallowReactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers
} from './baseHandlers'

export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers)
}

// 会自动垃圾回收，不造成内存泄漏，存储的key只能是对象
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

// 仅读？深度？  柯里化  new Proxy() 拦截 get set
export function createReactiveObject(target, isReadonly, baseHandlers) {
  // 只有对象才能被拦截
  if (!isObject(target)) {
    return target
  }

  // 代理过的就不用代理了，直接返回原先的代理
  // 维护两个map，保存 普通响应式 与 只读 （因为响应式也可以标记为只读）
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  const existProxy = proxyMap.get(target)
  if (existProxy) {
    return existProxy // 已经代理过，直接返回
  }

  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy) // 将要代理的对象和代理的结果换成

  return proxy
}
