const queue = []
export function queueJob(job) {
  // 多次更新只执行一次
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

let isFlushPending = false
function queueFlush() {
  if (!isFlushPending) {
    isFlushPending = true

    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  isFlushPending = false

  // 清空时 需要根据调用的顺序依次更新
  // 更新顺序：从父到子    因为父组件的序号在子组件之前
  // 避免子组件更新之后可能会导致父组件重复刷新
  queue.sort((a, b) => a.id - b.id)

  for (let i = 0; i < queue.length; i++) {
    const job = queue[i]
    job()
  }

  queue.length = 0
}
