import { ShapeFlags, isFunction, isObject } from '@vue/shared/src'
import { PublicInstanceProxyHandlers } from './componentPublicInstance'

// instance 表示组件的状态（各种状态及组件相关信息）
// context 4个参数，为了开发时使用
// proxy 为了取值方便

export function createComponentInstance(vnode) {
  // 组件实例 (组件核心：属性、插槽)
  const instance = {
    vnode,
    type: vnode.type,
    props: {}, // vnode.props包含 props 和 attrs
    attrs: {},
    slots: {},
    data: {}, // vue2的data
    setupState: {}, // 如果setup返回一个对象，这个对象会作为setupState
    ctx: null,
    isMounted: false // 组件是否挂载过
  }

  // 创建一个对象，专门用来做代理
  instance.ctx = { _: instance } // 通过instance.ctx._ 可以访问instance

  return instance
}

export function setupComponent(instance) {
  const { props, children } = instance.vnode // { type, props, children }

  // 根据props 解析出 props 和 attrs，将其放到instance上
  instance.props = props // initProps()
  instance.children = children // 插槽的解析 initSlot()

  // 当前组件是不是有状态的组件，因为可能是函数组件
  const isStateFul = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  if (isStateFul) {
    // 有状态的组件
    // 调用当前实例的setup方法，用setup的返回值，填充setupState和对应的render方法
    setupStatefulComponent(instance)
  }
}

export let currentInstance = null
export const setCurrentInstance = instance => (currentInstance = instance)
// 在setup中获取当前实例
export const getCurrentInstance = () => currentInstance

function setupStatefulComponent(instance) {
  // 1.代理 传递给render函数的参数
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  // 2.获取组件的类型 拿到组件的setup方法
  const Component = instance.type // 用户定义的对象
  const { setup } = Component

  // ------ 有setup -------
  if (setup) {
    currentInstance = instance
    const setupContext = createSetupContent(instance)

    //  setup传入的setupContext和instance不是一个东西，instance里面包含的内容会提取一些传递给context
    const setupResult = setup(instance.props, setupContext) // instance中props attrs slots emit expose会被提取出来，因为开发过程中会用这些属性

    currentInstance = null
    handleSetupResult(instance, setupResult)
  } else {
    // ----- 没有setup ------
    finishComponentSetup(instance) // 完成组件的启动
  }

  // Component.render(instance.proxy)
}

// 处理setup的返回值
function handleSetupResult(instance, setupResult) {
  // 判断setup返回值类型
  if (isFunction(setupResult)) {
    // 如果是函数
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 如果是对象
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type

  // instance.render的优先级高于组件的render !!!
  // 即setup的返回值是函数的情况
  if (!instance.render) {
    // 如果没有render
    // 需要对template模版进行编译 产生render函数
    if (!Component.render && Component.template) {
      // 模版编译 将结果赋予Component.render
    }

    // 将生成的render函数挂载在实例上
    instance.render = Component.render
  }

  // 对vue2 api做兼容性处理
  // applyOptions
  // 循环遍历，将以前的api和现在的做合并
}

function createSetupContent(instance) {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: () => {},
    expose: () => {}
  }
}
