# 编译过程
- 先将模板进行分析  生成对应的ast树  -> 对象来描述语法
- 做转化流程 transform -> 对动态节点做一些标记 指令 插槽 事件 文本 属性... patchFlag(标记组件会变化的内容)
- 代码生成 codegen -> 生成最终代码

## Block的概念 -> Block Tree
- diff算法的特点：递归遍历，每次比较同一层（之前都是全量递归）
- block作用：收集动态节点（自身下面所有的） 将树的递归拍平成了一个数组
- 在createVnode的时候 会判断这个节点是动态的，就让外层的block收集起来
- 动态节点作用：如果不需要递归时(不会破坏原来的结构)只要比较一层，需要递归(vif,vfor这种会破坏原来结构)才会递归

> 如果会影响结构的 都会被标记成block  (v-if v-else 会自动产生key) (v-for 不会产生key)
> 父级也会收集子级的block -> blockTree（多个节点组成）
```
block ---> div 父级更新 会找到dyminacChildren => 子的block 和动态节点
  block(v-if key="0") <div>{{xxx}}</div>
block ---> div
  block(v-else key="1") <div>{{xxx}}</div>
```
> 改变结构的要封装到block中，期望的更新方式是拿以前的和现在的区别靶向更新。如果前后节点个数不一致，那只能全部比对(v-for)
```
block ---> div
  block ---> v-for 不收集动态节点
block ---> div
  block ---> v-for 不收集动态节点
```
> 子节点全量对比

## patchFlags 对不同的动态节点进行描述
- 位运算
> 表示要比对哪些类型

## 性能优化
- 每次重新渲染 都要创建虚拟节点 createVNode这个方法
- 静态提升 静态节点进行提取 （第一次创建时缓存静态节点，后面使用时从缓存获取）
  - 大量重复静态节点会再进行合并提取，合并成同一个方法

## 事件缓存
- 缓存事件  防止重新创建事件

## Vue3和Vue2对比
- 响应式原理 proxy -> defineProperty
- diff算法
  - Vue2全量diff
  - Vue3根据patchFlag做diff + 最长递增子序列(贪心+二分+反向查找 )
- 写法
  - Vue2 Options Api
  - Vue3 CompositionApi 支持tree shaking
- Fragment 支持多个根节点、Teleport 传送门、Suspense 异步组件、keepalive、transition
- Vue3 ts / Vue2 flow
- 自定义渲染器 createRender 传入自己渲染的方法，根据vue核心实现不同平台代码
- monorepo代码管理方式 一个项目管理多个仓库
- 模版编译优化




