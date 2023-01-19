// domAPI方法
// 节点（增删改查）、属性操作（增删改 样式、类、事件、其他属性）
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { extend } from '@vue/shared/src'
import { createRenderer } from '@vue/runtime-core/src'

const rendererOptions = extend({ patchProp }, nodeOps)

// 核心方法在runtime-core中
export function createApp(rootComponent, rootProps = null) {
  const app = createRenderer(rendererOptions).createApp(
    rootComponent,
    rootProps
  )

  const { mount } = app

  app.mount = function(container) {
    // 清空操作
    container = nodeOps.querySelector(container)
    container.innerHTML = ''

    // 将组件渲染成dom元素，进行挂载
    mount(container)
  }

  return app
}

export * from '@vue/runtime-core'
// 用户调用的是runtime-dom -> runtime-core
// runtime-dom是为了解决平台差异（浏览器）
