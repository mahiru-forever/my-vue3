export const nodeOps = {
  // 不同的平台创建元素的方式不同

  /** 元素 */
  // 增加
  createElement: tagName => document.createElement(tagName),
  // 删除
  remove: child => {
    const parent = child.parentNode

    if (parent) {
      parent.removeChild(child)
    }
  },
  // 插入
  insert: (child, parent, anchor = null) => {
    parent.insertBefore(child, anchor) // anchor为null相当于appendChild
  },
  // 查找
  querySelector: selector => document.querySelector(selector),
  // 设置文本
  setElementText: (el, text) => (el.textContent = text),

  /** 文本操作 */
  // 创建文本
  createText: text => document.createTextNode(text),
  // 设置文本
  setText: (node, text) => (node.nodeValue = text)
}
