import { hasOwn } from '@vue/shared/src'

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // 取值时 要访问 setUpState props data
    const { setUpState, props, data } = instance

    if (key[0] === '$') {
      // 不能访问$ 开头的变量
      return
    }
    if (hasOwn(setUpState, key)) {
      return setUpState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    } else if (hasOwn(data, key)) {
      return data[key]
    } else {
      return undefined
    }
  },
  set({ _: instance }, key, value) {
    const { setUpState, props, data } = instance

    if (hasOwn(setUpState, key)) {
      return (setUpState[key] = value)
    } else if (hasOwn(props, key)) {
      return (props[key] = value)
    } else if (hasOwn(data, key)) {
      return (data[key] = value)
    } else {
      return true
    }
  }
}
