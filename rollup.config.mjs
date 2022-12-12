import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import json from '@rollup/plugin-json'
import ts from 'rollup-plugin-typescript2'
import resolvePlugin from '@rollup/plugin-node-resolve'

// es下定义__dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// 根据环境变量中的target属性，获取对应模块中的package.json
const packagesDir = path.resolve(__dirname, 'packages')

// 找到要打的某个包 打包基本目录
const packageDir = path.resolve(packagesDir, process.env.TARGET)

// 针对包下某个模块  resolve(package.json)
const resolve = p => path.resolve(packageDir, p)

// package.json配置文件
const pkg = JSON.parse(
  fs.readFileSync(resolve('package.json'), { encoding: 'utf8' })
)

// 文件名
const name = path.basename(packageDir)

// 对打包类型做一个映射表，根据formats来格式化需要打包的内容
const outputConfig = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: 'iife'
  }
}

// package.json中定义的选项
const options = pkg.buildOptions

function createConfig(format, output) {
  output.name = options.name
  output.sourcemap = true // 生成sourcemap

  // 生成rollup配置
  return {
    input: resolve('src/index.ts'),
    output,
    plugins: [
      json(),
      // ts 插件
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json')
      }),
      // 解析第三方模块插件
      resolvePlugin()
    ]
  }
}

// 到处rollup配置变量
export default options.formats.map(format =>
  createConfig(format, outputConfig[format])
)
