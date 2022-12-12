// 只针对具体某个包打包
const fs = require('fs')
const execa = require('execa') // 开启子进程，用rollup打包

async function build(target) {
  // rollup -c --environment TARGET:xxx
  await execa('rollup', ['-cw', '--environment', `TARGET:${target}`], {
    // 子进程输出共享到父进程
    stdio: 'inherit'
  })
}

const target = 'reactivity'

build(target)
