# 系统模式

## 技术栈

### 运行时
- **服务器**：Bun（高性能 JavaScript 运行时）
- **客户端**：Vite（现代前端构建工具）

### 服务器端
- **HTTP 服务**：Hono（轻量级 Web 框架）
- **WebSocket 通信**：Socket.IO（实时双向通信）

### 客户端
- **UI 框架**：Vue 3（Composition API + `<script setup>` 语法）
- **样式**：Tailwind CSS（实用优先的 CSS 框架）

### 语言和工具
- **语言**：TypeScript（严格模式）
- **包管理**：Bun workspaces（monorepo 管理）
- **数据库**：SQLite（轻量级嵌入式数据库）

## 项目结构

### Monorepo 三包结构
项目采用 Bun workspaces 管理三个独立的包：

1. **`packages/server`** - 游戏服务器
   - `src/main.ts` - 应用入口点，HTTP + WebSocket 服务
   - `src/game/` - 游戏逻辑实现
   - `src/Player.ts` - 玩家实体类
   - `src/PlayerManager.ts` - 玩家会话管理
   - `src/RoomManager.ts` - 房间生命周期管理
   - `src/AccountStore.ts` - 账号系统（SQLite）
   - `src/playerClient.ts` - 远程客户端 RPC 代理

2. **`packages/client`** - Vue 3 前端
   - `src/game/` - 游戏相关组件和服务
     - `Game.vue` - 游戏主组件
     - `GameService.ts` - 游戏状态管理和 RPC 服务
     - `ConnectionManager.ts` - WebSocket 连接管理
     - `views/` - 页面级组件（Layout、Board、Player、Opponent 等）
     - `components/` - 可复用组件（CardItem、CardList 等）
   - `src/views/` - 应用页面（AuthView、LobbyView）
   - `src/main.ts` - 客户端应用入口

3. **`packages/shared`** - 共享类型和工具
   - `rpc.ts` - RPC 协议定义和可复活对象机制
   - `game.ts` - 游戏类型定义和卡牌基类
   - `chat.ts` - 聊天消息类型定义

### 目录组织原则
- 共享类型和工具必须放在 `packages/shared` 中
- 包之间的依赖通过 workspace 引用：`"@meeplit/shared": "workspace:*"`
- 服务器逻辑集中在 `packages/server/src/game/` 目录
- 客户端组件按功能组织在 `packages/client/src/game/` 目录

## 核心架构模式

### 反向 RPC 模式

#### 设计理念
传统的通信模式是客户端请求服务器，服务器返回结果。Meeplit 采用相反的模式——服务器主动询问客户端"这回合你要做什么"，客户端返回结果由服务器处理。这样，游戏逻辑可以集中在一个 main 函数中完成。

#### 三种调用模式
1. **`emit()`** - 单向通知，不等待响应
   - 用于状态更新、广播消息
   - 示例：`client.gameService.setGameInfo.emit(gameState)`

2. **`call()`** - 请求-响应，需要返回值
   - 用于玩家输入、确认操作
   - 可设置超时和默认返回值
   - 示例：`const answer = await client.gameService.ask.call(question)`

3. **`reserve()`** - 收集请求描述符，用于批量执行
   - 收集多个请求，一次性发送
   - 支持顺序（sequential）或并行（parallel）执行
   - 示例：`const batch = client.gameService.ask.reserve(question)`

#### 批量调用
- `emitBatch()` - 批量单向通知
- `callBatch()` - 批量请求-响应
- `callBatchAll()` - 向所有玩家批量请求

### 状态管理模式

#### 服务器为中心
- 服务器是唯一的状态源
- 客户端状态是服务器的投影
- 通过 RPC 同步状态变更
- 客户端本地状态仅用于 UI 交互

#### Vue 3 Composition API
- 使用 `ref` 和 `computed` 管理响应式状态
- 通过 `provide/inject` 在组件树中共享游戏状态
- `GameService` 类封装所有 RPC 方法调用
- 组件通过 `useGameState()` 钩子访问状态

### 房间生命周期

1. **创建房间**：HTTP API `POST /api/rooms`
2. **加入房间**：HTTP API `POST /api/rooms/:id/join`
3. **准备游戏**：HTTP API `POST /api/rooms/:id/ready`
4. **开始游戏**：当所有玩家准备就绪时自动触发 `onAllReadyStart` 回调
5. **游戏进行**：服务器通过 RPC 驱动游戏流程
6. **断开处理**：自动清理房间中的玩家座位

### 卡牌传输机制

#### 可复活对象
- 所有卡牌类必须继承自 `Card` 基类
- 必须使用 `@Revivable` 装饰器标记
- RPC 系统自动处理类实例的序列化和反序列化

#### 传输流程
1. 服务器创建卡牌实例
2. 通过 RPC 发送到客户端
3. 客户端收到的是真正的类实例，可以调用其方法
4. 支持自定义 `img`、`name`、`description_url` 属性
5. 可以在 `play()` 方法中实现卡牌效果

## 核心模块

### 1. 反向 RPC 系统（`packages/shared/rpc.ts`）
- 基于 Socket.IO 的 ack 功能，提供类型安全的代理
- 支持批量调用（sequential/parallel）和序列调用
- 可复活（Revivable）对象传输机制，支持类实例的序列化/反序列化

### 2. 远程客户端代理（`packages/server/src/playerClient.ts`）
- 提供 `RemoteClient` 类，为每个玩家连接生成 RPC 代理
- 支持三种调用模式：`emit()`、`call()`、`reserve()`
- 批量调用支持 `emitBatch()`、`callBatch()`、`callBatchAll()`
- 超时处理和默认返回值机制

### 3. 连接管理器（`packages/client/src/game/ConnectionManager.ts`）
- 封装 Socket.IO 客户端连接
- 暴露 RPC 对象给服务器调用
- 处理 RPC 请求分发和错误处理

### 4. 游戏服务（`packages/client/src/game/GameService.ts`）
- Vue 3 Composition API 实现的状态管理
- 提供 `setGameInfo`、`ask`、`playCard`、`updateCard` 等 RPC 方法
- 通过依赖注入（provide/inject）共享游戏状态

### 5. 房间系统（`packages/server/src/RoomManager.ts`）
- 房间创建、加入、准备状态管理
- 支持容量限制和随机座位分配
- 当所有玩家准备就绪时自动开始游戏

### 6. 玩家管理（`packages/server/src/PlayerManager.ts`）
- 玩家会话管理
- 玩家与 Socket 连接绑定
- 玩家状态跟踪（房间、座位、准备状态）

### 7. 账号系统（`packages/server/src/AccountStore.ts`）
- SQLite 存储账号信息
- 简单的用户名/密码验证
- 会话 ID 生成和管理

### 8. 卡牌系统（`packages/shared/game.ts`）
- 抽象基类 `Card`，使用 `@Revivable` 装饰器
- 支持自定义卡牌图片、名称、描述
- 通过 RPC 可复活机制在客户端和服务器之间传输

## 代码风格规范

### TypeScript
- 使用严格模式（`strict: true`）
- 优先使用接口（interface）而非类型别名（type），除非需要联合类型或映射类型
- 避免使用 `any`，使用 `unknown` 或具体类型
- 导出类型时使用 `export type { ... }` 语法
- 使用 `camelCase` 命名变量和函数，`PascalCase` 命名类和接口

### Vue 3 组件
- 使用 `<script setup>` 语法
- 组件文件名使用 `PascalCase`，例如 `GameInfo.vue`
- 组合式函数使用 `use` 前缀，例如 `useGameState`
- Props 使用 TypeScript 接口定义
- 避免在模板中使用复杂的逻辑，提取到计算属性或方法中

### RPC 通信
- RPC 方法命名使用 `camelCase`
- 服务器调用客户端方法时使用 `.` 分隔的路径，例如 `gameService.ask`
- 使用适当的调用模式：
  - `emit()` - 单向通知，不等待响应
  - `call()` - 请求-响应，需要返回值
  - `reserve()` - 收集请求用于批量执行
- 批量调用时指定执行模式：`sequential`（顺序）或 `parallel`（并行）

### 卡牌类设计
- 所有卡牌类必须继承自 `Card` 基类
- 必须使用 `@Revivable` 装饰器
- 必须实现 `img`、`name` 属性
- 可选实现 `description_url` 属性
- 可以在 `play()` 方法中实现卡牌效果

## 开发工作流

### 前端开发
- 前端代码使用 Vite 开发服务器运行
- 开发者自行查看样式效果，无需 AI 启动测试服务器
- AI 在修改前端代码后只需关注 TypeScript 报错
- 使用 `bun run dev` 启动开发服务器

### 代码质量检查
- 修改代码后运行 `bun run type-check` 检查 TypeScript 类型
- 使用 `bun run lint` 进行代码风格检查
- 提交前确保没有 TypeScript 错误

### 测试策略
- 核心 RPC 功能必须有单元测试
- 房间管理和玩家管理必须有集成测试
- 新增功能必须包含测试用例
- 运行测试：`bun test`

### 部署考虑
- 服务器使用 Bun runtime，部署简单
- 客户端使用 Vite 构建，支持现代浏览器
- SQLite 数据库无需额外服务，适合小型部署
- 使用环境变量管理配置
- 不同环境使用不同配置文件
- 敏感信息不提交到版本控制

---

*最后更新：2026-02-24*