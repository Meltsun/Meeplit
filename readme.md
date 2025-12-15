## 技术栈选择
monorepo
前端 vue vite
后端 bun hono
通信 jsonrpc2.0 socket.io

## 模块设计
### 服务器call浏览器的rpc
前端托管一个对象，后端生成一个stub，call stub会rpc前端对象。
用于后端方便的调用前端对象。
### 实现
jsonrpc via socket.io
浏览器端实现了特别的jsonrpc server，托管一个对象，当收到rpc方法名未登记且以.开头时，尝试解析为调用并登记
服务器端使用标准的jsonrpc client，使用代理获得调用链转化为.a.b.c这样的方法名
### 使用
提供了stub（Proxy），调用即触发rpc。
支持缓冲，把多次调用整合为一次rpc。这在需要进行一系列操作且不太关心中间结果时有用。（和jsonrpc标准的batch不同，batch是多个任务并发）

3种stub的

```js
x.stub_buffer.a()
x.batch


```


#### 已知限制
1. 不支持可选调用。
2. 不支持获取字段值，
