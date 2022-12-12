## vue3 与 vue2 区别
- monorepo方式管理，packages，多模块(每个模块一个包)
- Ts支持，vue2用的flow
- 性能优化，支持TreeShaking
- vue2后期引入RFC，每个版本改动可控
- *核心优化点*：重写虚拟dom
- *核心优化点*：ComponsitionApi
- 响应式数据方式
- 新增组件Fragment、Teleport、Suspense
  - Fragment：外层包一层虚拟节点
  - Teleport：传送门
  - Suspense：异步组件

## Vue3 项目结构
- reactivity 响应式系统
- runtime-core 无关平台运行时核心
- runtime-dom 浏览器运行时核心（包括DOM API，属性，事件等）
- runtime-test 用于测试
- server-renderer 服务端渲染
- compiler-core 无关平台 编译时核心
- compiler-dom 浏览器编译时核心
- compiler-ssr 服务端渲染编译时核心
- compiler-sfc 单文件解析
- size-check 测试代码体积
- template-explorer 调试编译器输出的开发工具
- shared 多个包直接共享的内容
- vue 完整版本（运行时+编译器）
