import { isString, ShapeFlags, isObject, isArray } from '@vue/shared/src'

export function isVnode(vnode) {
  return vnode.__v_isVnode
}

// createVNode 创建虚拟节点核心流程

// h('div', { style: {color:'red'} }, 'children')  h方法和createApp类似
export const createVNode = (type, props, children = null) => {
  // 根据type区分是组件还是普通元素

  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0

  // 描述一个虚拟节点（有跨平台能力）
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    component: null, // 组件对应的实例
    el: null, // 将虚拟节点和真实节点对应起来
    key: props && props.key, // diff算法用到
    shapeFlag
  }

  // 带上子节点的类型
  normalizeChildren(vnode, children)

  return vnode
}

function normalizeChildren(vnode, children) {
  let type = 0
  if (children === null) {
    // 不进行处理
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else {
    type = ShapeFlags.TEXT_CHILDREN
  }

  vnode.shapeFlag |= type
}

export const TEXT = Symbol('Text')
export function normalizeVNode(child) {
  if (isObject(child)) {
    return child
  }
  // 文本
  return createVNode(TEXT, null, String(child))
}
