import { createAppApi } from './apiCreateApp'
import { ShapeFlags } from '@vue/shared/src'
import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity/src'
import { normalizeVNode, TEXT } from './vnode'
import { queueJob } from './scheduler'

// 告诉core怎么渲染
// createRenderer 创建渲染器
export function createRenderer(rendererOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText
  } = rendererOptions

  // -------- 处理组件方法 ---------
  const setupRenderEffect = (instance, container) => {
    // 需要创建一个effect，在effect中调用render方法，这样render方法中拿到的数据会收集这个effect，属性更新时会重新执行

    // 每个组件都会有一个effect，vue3是组件级更新，数据变化会重新执行对应组件的effect
    instance.update = effect(function componentEffect() {
      if (!instance.isMounted) {
        // 没有被挂载，初次渲染
        const proxyToUse = instance.proxy
        // 虚拟节点  渲染内容
        // $vnode   _vnode   vue2
        // vnode    subTree  vue3
        const subTree = (instance.subTree = instance.render.call(
          proxyToUse,
          proxyToUse
        ))

        // 用render函数的返回值继续渲染
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        // 更新逻辑
        // 不能每次数据变更就执行，需要降低频率，以最后一次数据变更为准
        // 通过scheduler自定义更新策略，维护一个队列，进行去重

        // diff算法（核心 diff + 序列优化 + watchApi + 生命周期）
      }
    }, {
      scheduler: queueJob
    })
  }

  const mountComponent = (initialVNodel, container) => {
    // 组件的渲染流程
    // 核心：调用setup 拿到返回值，获取render函数返回的结果进行渲染
    // 1.创建组件实例
    const instance = (initialVNodel.component = createComponentInstance(
      initialVNodel
    ))

    // 2.需要的数据解析到实例上
    setupComponent(instance)

    // 3.创建一个effect，让render函数执行
    setupRenderEffect(instance, container)
  }

  const processComponent = (n1, n2, container) => {
    if (n1 === null) {
      // 组件没有上一次的虚拟节点 ==》 初始化组件
      mountComponent(n2, container)
    } else {
      // 组件更新
    }
  }

  // -------- 处理组件方法结束 ---------

  // -------- 处理元素方法 ---------
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      // 处理文本的情况（将文本转成虚拟节点(对象的形式)）
      const child = normalizeVNode(children[i])

      // 挂载到父容器上
      patch(null, child, container)
    }
  }

  // 挂载元素
  // children如果是文本直接给容器设置文本
  // 如果是数组里的文本，则需要创建文本节点插入进父容器
  const mountElement = (vnode, container) => {
    // 递归渲染
    const { props, shapeFlag, type, children } = vnode
    // 创建真实节点
    const el = (vnode.el = hostCreateElement(type))

    // 设置元素属性
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本，直接插入即可
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }

    // 插入页面
    hostInsert(el, container)
  }

  const processElememt = (n1, n2, container) => {
    if (n1 === null) {
      // 元素挂载（初始化）
      mountElement(n2, container)
    } else {
      // 元素更新
    }
  }
  // -------- 处理元素方法结束 ---------

  // -------- 处理文本方法 ---------
  const processText = (n1, n2, container) => {
    if (n1 === null) {
      // 插入
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    } else {
      // 更新
    }
  }
  // -------- 处理文本方法结束 ---------

  const patch = (n1, n2, container) => {
    // 针对不同类型 做初始化操作
    const { shapeFlag, type } = n2

    switch (type) {
      // 处理文本
      case TEXT:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 是元素
          processElememt(n1, n2, container)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 是组件
          processComponent(n1, n2, container)
        }
        break
    }
  }

  // render: core的核心
  const render = (vnode, container) => {
    // 根据不同的虚拟节点，创建对应的真实元素

    // 默认调用render 可能是初始化流程
    patch(null, vnode, container)
  }

  return {
    // 用什么组件和属性来创建应用
    createApp: createAppApi(render)
  }
}
