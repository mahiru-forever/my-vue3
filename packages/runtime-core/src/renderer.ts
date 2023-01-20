import { createAppApi } from './apiCreateApp'
import { ShapeFlags } from '@vue/shared/src'
import { createComponentInstance, setupComponent } from './component'
import { effect } from '@vue/reactivity/src'
import { normalizeVNode, TEXT } from './vnode'
import { queueJob } from './scheduler'
import { getSequence } from './utils'

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
    setElementText: hostSetElementText,
    nextSibling: hostNextSibling
  } = rendererOptions

  // -------- 处理组件方法 ---------
  const setupRenderEffect = (instance, container) => {
    // 需要创建一个effect，在effect中调用render方法，这样render方法中拿到的数据会收集这个effect，属性更新时会重新执行

    // 每个组件都会有一个effect，vue3是组件级更新，数据变化会重新执行对应组件的effect
    instance.update = effect(
      function componentEffect() {
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

          // 上一次生成的树
          const prevTree = instance.subTree
          const proxyToUse = instance.proxy
          // 新树
          const nextTree = instance.render.call(proxyToUse, proxyToUse)

          patch(prevTree, nextTree, container)
        }
      },
      {
        // 更新实际走的
        scheduler: queueJob
      }
    )
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
  const mountElement = (vnode, container, anchor = null) => {
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
    hostInsert(el, container, anchor)
  }

  const patchProp = (oldProps, newProps, el) => {
    if (oldProps === newProps) {
      return
    }

    // 更新新的属性
    for (let key in newProps) {
      const prev = oldProps[key]
      const next = newProps[key]
      if (prev !== next) {
        hostPatchProp(el, key, prev, next)
      }
    }

    // 删除多余的属性
    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps, null)
      }
    }
  }

  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  // diff算法
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    // 对特殊情况进行优化 尽可能减少比对的区域
    // 从头部开始比对，缩小前面的范围
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      if (isSameVNodeType(n1, n2)) {
        // 继续比对子节点
        patch(n1, n2, el)
      } else {
        break
      }

      i++
    }

    // 从尾部开始比对，缩小后面的范围
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]

      if (isSameVNodeType(n1, n2)) {
        // 继续比对子节点
        patch(n1, n2, el)
      } else {
        break
      }

      e1--
      e2--
    }

    // 特殊情况 有一方已经完全比完了
    // 同序列挂载 or 同序列移除

    if (i > e1) {
      // 有一方已经完全比完了
      // 旧的少 新的多
      // 有新增
      if (i <= e2) {
        // 判断是向前插入还是向后插入  判断e2的下一个位置有没有
        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 有一方已经完全比完了
      // 旧的多新的少
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    } else {
      // 乱序比较，需要尽可能复用 新元素做成一个映射表去旧的里找，一样的复用，不一样的新的插入旧的删除
      let s1 = i
      let s2 = i

      const keyToNewIndexMap = new Map()

      // 生成映射表
      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }

      const toBePatched = e2 - e1 + 1
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      // 去老的里找有没有复用的
      for (let i = s1; i <= e1; i++) {
        const oldVnode = c1[i]
        const newIndex = keyToNewIndexMap.get(oldVnode.key)

        if (newIndex === undefined) {
          // 老的不在新的中，直接删除
          unmount(oldVnode)
        } else {
          // 新的旧的索引关系
          // + 1防止出现 0 的情况，因为0是表示需要新增的内容
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          // 老的在新的中，进行比对，此处比较完后元素位置有差异
          patch(oldVnode, c2[newIndex], el)
        }
      }

      // 获得最长子序列  [5,3,4,0] => [1,2]
      let increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
      let j = increasingNewIndexSequence.length - 1

      // 最后移动节点，并且将新增的节点插入
      // 倒序插入
      for (let i = toBePatched - 1; i >= 0; i--) {
        const currentIndex = i + s2 // 节点的索引
        const child = c2[currentIndex]
        const anchor =
          currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null

        if (newIndexToOldIndexMap[i] === 0) {
          // 新元素还没有被patch过 新增
          patch(null, child, el, anchor)
        } else {
          // 所有的节点都会被移动一遍，需要尽可能减少移动次数
          // 使用最长递增子序列优化
          if (i !== increasingNewIndexSequence[j]) {
            hostInsert(child.el, el, anchor)
          } else {
            // 跳过不需要移动的元素
            j--
          }
        }
      }
    }
  }

  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children
    const c2 = n2.children

    // 可能的情况：
    // 旧的有子节点 新的没有
    // 新的有子节点 旧的没有
    // 新旧都有子节点
    // 新旧都是文本

    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag

    // 新节点是个文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧的有n个子节点  但是新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 如果c1中包含组件会调用组件的销毁方法
        unmountChildren(c1)
      }

      // 两个都是文本
      if (c2 !== c1) {
        hostSetElementText(el, c2)
      }
    } else {
      // 现在是元素
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 当前是数组  之前是数组 =》 diff算法
          patchKeyedChildren(c1, c2, el)
        } else {
          // 当前没有子节点
          unmountChildren(c1)
        }
      } else {
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 上一次是文本
          hostSetElementText(el, '')
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 现在是数组，将新的内容挂载到容器中
          mountChildren(c2, el)
        }
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    // 相同节点  复用旧元素
    const el = (n2.el = n1.el)

    // 更新属性 更新子节点
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    patchProp(oldProps, newProps, el)

    patchChildren(n1, n2, el)
  }

  const processElememt = (n1, n2, container, anchor) => {
    if (n1 === null) {
      // 元素挂载（初始化）
      mountElement(n2, container, anchor)
    } else {
      // 元素更新
      patchElement(n1, n2, container)
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

  const isSameVNodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key
  }

  const unmount = n1 => {
    // 删除旧元素
    hostRemove(n1.el)

    // 如果是组件还需要调用组件的生命周期
    // ...
  }

  const patch = (n1, n2, container, anchor = null) => {
    // 针对不同类型 做初始化操作
    const { shapeFlag, type } = n2

    // 不相同元素
    if (n1 && !isSameVNodeType(n1, n2)) {
      // 参照物，后续插入元素插入在这个之前
      anchor = hostNextSibling(n1)

      // 删掉以前的 换成n2
      unmount(n1)

      // 当成组件挂载重新渲染n2
      n1 === null
    }

    switch (type) {
      // 处理文本
      case TEXT:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 是元素
          processElememt(n1, n2, container, anchor)
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

// 将组件 变成vnode -》 再将vnode变成真实的dom -》 插入到页面上
// render方法的作用可以渲染一个虚拟节点 将他挂载到具体的dom元素上
// vue3的执行核心 patch方法

// 组件创造过程
// 创造一个instance -》 初始化
// 根据用户传入组件  拿到对应的内容  来填充instance
// 创建effect 并且调用render方法，数据会将对应的effect收集起来
// 拿到render方法返回的结果  再次走渲染流程 -》 patch

// 组件渲染顺序 先父后子

// 每个组件都是一个effect
