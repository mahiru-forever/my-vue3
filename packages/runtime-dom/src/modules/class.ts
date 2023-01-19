export const patchClass = (el, next) => {
  if (next === null) {
    el.className = ''
  }
  el.className = next
}
