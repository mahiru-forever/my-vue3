// 把packages目录下所有包进行打包
const fs = require('fs')
const execa = require('execa') // 开启子进程，用rollup打包

// 获取packages下所有目录
const targets = fs.readdirSync('packages').filter(f => {
  if (fs.statSync(`packages/${f}`).isDirectory()) {
    return true
  }
  return false
})

async function build(target) {
  // rollup -c --environment TARGET:xxx
  await execa('rollup', ['-c', '--environment', `TARGET:${target}`], {
    // 子进程输出共享到父进程
    stdio: 'inherit'
  })
}

function runParallel(targets, iteratorFn) {
  const res = []
  for (const item of targets) {
    const p = iteratorFn(item)
    res.push(p)
  }

  return Promise.all(res)
}

// 对所有目标进行打包（并行）
runParallel(targets, build)
