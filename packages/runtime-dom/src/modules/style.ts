export const patchStyle = (el, prev, next) => {
  const style = el.style

  if (next === null) {
    el.removeAttribute('style')
  } else {
    // 老的里有，新的没有，需要删除
    for (const key in prev) {
      if (!next[key]) {
        style[key] = ''
      }
    }

    // 新的值
    for (const key in next) {
      style[key] = next[key]
    }
  }
}
