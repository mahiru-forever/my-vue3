import { isObject, isArray } from '@vue/shared/src'
import { createVNode, isVnode } from './vnode'

// render函数参数的情况，做兼容处理
// h('div', {})
// h('div', 'hello world')
// h('div', {}, 'hello world')
// h('div', {}, ['p', 'span'])
// h('div', {}, h('p'), h('span'))
// ...
export function h(type, propsOrChildren, children) {
  const l = arguments.length

  if (l === 2) {
    // 类型+属性   类型+children

    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // 是对象 => props or vnode
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      return createVNode(type, propsOrChildren)
    } else {
      // 不是对象 => children
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    // 大于3的都是children
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isObject(children)) {
      children = [children]
    }

    return createVNode(type, propsOrChildren, children)
  }
}
