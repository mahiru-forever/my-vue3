## vue3 与 vue2 区别
- monorepo方式管理，packages，多模块(每个模块一个包)
- Ts支持，vue2用的flow
- 性能优化，支持TreeShaking
- vue2后期引入RFC，每个版本改动可控
- *核心优化点*：重写虚拟dom
- *核心优化点*：ComponsitionApi
- 响应式数据方式
- 新增组件Fragment、Teleport、Suspense
  - Fragment：外层包一层虚拟节点
  - Teleport：传送门
  - Suspense：异步组件

## Vue3 项目结构
- reactivity 响应式系统
- runtime-core 无关平台运行时核心
- runtime-dom 浏览器运行时核心（包括DOM API，属性，事件等）
- runtime-test 用于测试
- server-renderer 服务端渲染
- compiler-core 无关平台 编译时核心
- compiler-dom 浏览器编译时核心
- compiler-ssr 服务端渲染编译时核心
- compiler-sfc 单文件解析
- size-check 测试代码体积
- template-explorer 调试编译器输出的开发工具
- shared 多个包直接共享的内容
- vue 完整版本（运行时+编译器）

## Vue3 reactive模块
### reactive模块api
- reactive，shallowReactive
- readonly，shallowReadonly
- effect （get时track，set时trigger）
- ref, shallowRef
- toRef, toRefs
- toRaw：返回Proxy代理的原对象
- markRaw：表示当前对象不可以被代理
### reactive核心方法
- 如果是readonly 直接返回
- 调用createReactiveObject(target, isReadonly, baseHandler, collectHandler)
  - 判断是不是已经代理过了 即readonly(reactive(target))
  - 获取对应映射表 isReadonly ? readonlyMap : reactiveMap
  - 判断要被代理的对象在不在映射表中 即obj，防止重复代理
  - 判断对象是不是可扩展的 （比如被markRaw标记的）
  - 添加Proxy代理，并缓存在映射表中
### createGetter
- isReactive，isReadonly，Raw等特殊取值操作
- 数组操作方法
  - includes,indexOf,lastIndexOf  对数组的每一项进行依赖收集
  - push,pop,shift,unshift,splice 控制依赖收集：先暂停依赖收集，执行完对应方法后，再重置依赖收集（防止某些场景下进入死循环）
- 判断是不是内置属性
- 判断是不是readonly
- 进行依赖收集
- 判断是不是shallow  shallow直接返回
- 如果reactive里包了ref？ 数组访问索引时返回原值（使用需要.value），对象属性访问时返回.value（使用不用.value）
- 是对 isReadonly ? readonly(res) : reactive(res)
### createSetter
- 不是shallow
  - 如果值是reactive，会被toRaw转为普通对象
  - 并且如果老值是ref，新值不是，新值会赋值给老值
- 如果是数组，并且是新增（索引 > length）
- 设置值
- 执行trigger（如果不是原型链上的修改则不处理）（新增走 add逻辑，不然走set逻辑）
### effect
- 如果已经是effect，就将effect的原函数拿出来重新创建新的effect
- effect已经在栈中则不往下执行 避免重复执行
- 清理当前effect收集依赖（effect会进行取值，触发get方法，重新进行依赖收集）避免不被引用的属性修改会触发effect执行
- 启用依赖收集
- 当前effect放入栈中
- 执行get方法 （重新收集依赖） 即effect中传入的自定义函数
- 停止依赖收集
- 当前effect移出栈中
### track
- 可以收集 并且 activeEffect 存在
- 判断obj在targetMap中存不在
- 判断key在obj Map中存不存（即dep => Set）
- 将activeEffect 存入key Set中
- 同时将dep存入activeEffect.deps中（用于effect中clearup()清楚依赖）
### trigger
- 从targetMap中取出
- 维护一个 Set 防止重复执行
- 遍历所有属性
  - 清空 =》 全部放入Set
  - 数组的length =》 key == length && key > newValue （修改数组长度：属性为长度以及原长度超过现长度的部分 放入set）
  - 其他属性 =》 放入set
- 执行set全部内容 =》 run(effect)
  - run方法
    - effect.options.onTrigger 有则会先执行
    - effect.options.scheduler 有则执行scheduler(effect)，没有则执行effect


