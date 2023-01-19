export const patchEvent = (el, key, next) => {
  // 对函数缓存
  const invokers = el._vel || (el._vel = {})

  const exists = invokers[key]

  if (next && exists) {
    // 需要绑定事件，且就旧事件的情况
    // 只改value提高性能
    exists.value = next
  } else {
    const eventName = key.slice(2).toLowerCase()

    if (next) {
      // 绑定事件，且以前没有绑定过
      const invoker = (invokers[key] = createInvoker(next))
      el.addEventListener(eventName, invoker)
    } else {
      // 以前绑定了，现在没有事件
      el.removeEventListener(eventName, exists)
      invokers[key] = undefined
    }
  }
}

function createInvoker(fn) {
  const invoker = e => {
    invoker.value(e)
  }

  invoker.value = fn // 方便随时更改value属性（用户定义事件）

  return invoker
}
