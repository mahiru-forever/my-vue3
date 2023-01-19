// 权限判断、类型  位运算最佳实践
export const enum ShapeFlags {
  ELEMENT = 1, // 元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
  STATEFUL_COMPONENT = 1 << 2, // 带状态的组件 普通组件
  TEXT_CHILDREN = 1 << 3, // 文本
  ARRAY_CHILDREN = 1 << 4, // 数组
  SOLTS_CHILDREN = 1 << 5, // 插槽
  TELEPORT = 1 << 6, // 传送门
  SUSPENSE = 1 << 7, // 异步组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEEP_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 判断是不是组件 00000010 & ShapeFlags.COMPONENT === 00000010 => 是个组件
}
