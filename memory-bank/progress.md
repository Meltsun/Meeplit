# 开发进度跟踪

## 项目状态
**状态**：抽空开发中（核心框架完成，游戏逻辑和 UI 完善中）

## 已完成功能 ✅

### 核心框架
- [x] **反向 RPC 系统** (`packages/shared/rpc.ts`)
  - RPC 协议定义（RpcRequest、RpcResponse、BatchRpcquest）
  - 错误处理（RPCErrorCode、RpcError）
  - 可复活对象机制（@Revivable、markRevivablePayload、reviveRehydratedValue）
  - 支持 emit、call、reserve 三种调用模式
  - 支持批量调用（sequential/parallel）

- [x] **远程客户端代理** (`packages/server/src/playerClient.ts`)
  - RemoteClient 类提供类型安全的 RPC 代理
  - 支持链式调用（createChainCollectorProxy）
  - 批量调用接口（emitBatch、callBatch、callBatchAll）
  - 超时处理和默认返回值机制

- [x] **连接管理器** (`packages/client/src/game/ConnectionManager.ts`)
  - Socket.IO 客户端封装
  - RPC 对象暴露（exposeRpcObject）
  - 安全方法调用（safeCallMethod）
  - 批量调用处理（batchCall）

- [x] **游戏服务** (`packages/client/src/game/GameService.ts`)
  - Vue 3 Composition API 状态管理
  - 游戏状态注入（GameStateKey、useGameState）
  - RPC 方法实现（setGameInfo、ask、playCard、updateCard 等）
  - 聊天消息处理（addChatMessage）

### 服务器端
- [x] **主服务器** (`packages/server/src/main.ts`)
  - Hono HTTP 服务器
  - Socket.IO WebSocket 服务器
  - 房间管理 API（/api/rooms、/api/login、/api/me）
  - 玩家连接和断开处理
  - 游戏循环骨架（startRoomGame）

- [x] **房间管理** (`packages/server/src/RoomManager.ts`)
  - 房间创建、加入、离开
  - 准备状态管理
  - 容量限制和座位分配
  - 房间状态转换（waiting → playing → finished）

- [x] **玩家管理** (`packages/server/src/PlayerManager.ts`)
  - 玩家会话管理
  - Socket 连接绑定
  - 玩家状态跟踪（房间、座位、准备状态）

- [x] **账号系统** (`packages/server/src/AccountStore.ts`)
  - SQLite 数据库存储
  - 用户名/密码验证
  - 会话 ID 生成和管理

- [x] **游戏逻辑基础** (`packages/server/src/game/index.ts`)
  - 测试卡牌实现（TestCard、UnknownCard）
  - 卡牌工厂模式

### 客户端
- [x] **游戏组件框架**
  - Game.vue - 游戏主组件
  - Layout.vue - 游戏布局组件
  - Ask.vue - 玩家输入询问组件
  - Player.vue - 玩家区域组件
  - Opponent.vue - 对手区域组件（骨架）
  - Board.vue - 游戏棋盘组件
  - Chat.vue - 聊天组件
  - GameInfo.vue - 游戏信息组件

- [x] **组件库**
  - CardItem.vue - 单张卡牌组件
  - CardList.vue - 卡牌列表组件
  - MarkdownPopover.vue - Markdown 弹窗组件

- [x] **视图页面**
  - AuthView.vue - 认证页面
  - LobbyView.vue - 大厅页面

### 共享类型
- [x] **RPC 协议** (`packages/shared/rpc.ts`)
- [x] **游戏类型** (`packages/shared/game.ts`)
- [x] **聊天类型** (`packages/shared/chat.ts`)

## 进行中功能 🚧

### 客户端 UI 完善
- [ ] **对手区组件** (`packages/client/src/game/views/Opponent.vue`)
  - 显示其他玩家信息
  - 状态指示器（准备状态、回合状态）
  - 手牌数量显示
  - 玩家头像/名称显示

- [ ] **玩家区组件** (`packages/client/src/game/views/Player.vue`)
  - 卡牌选择交互优化
  - 出牌确认流程完善
  - 能力显示和激活
  - 状态反馈（选中效果、禁用状态）

- [ ] **布局组件** (`packages/client/src/game/views/Layout.vue`)
  - 整合所有游戏区域
  - 响应式布局适配
  - 游戏状态同步显示

### 服务器结构重构
- [ ] **关注点分离**
  - HTTP 路由层分离
  - WebSocket 事件处理层分离  
  - 游戏逻辑层分离
  - 配置管理分离

- [ ] **游戏循环实现**
  - 完整的回合制逻辑
  - 卡牌分发机制
  - 回合计时器
  - 游戏状态持久化

## 待开发功能 📋

### 游戏功能
- [ ] **游戏规则引擎**
  - 可配置的游戏规则
  - 胜利条件判断
  - 特殊效果处理
  - 回合阶段管理

- [ ] **卡牌系统扩展**
  - 更多卡牌类型实现
  - 卡牌效果系统
  - 卡牌组合机制
  - 卡牌数据库管理

- [ ] **游戏状态管理**
  - 游戏历史记录
  - 状态恢复机制
  - 观战模式支持
  - 回放系统

### 用户体验
- [ ] **聊天系统增强**
  - 表情支持
  - 系统消息格式化
  - 游戏内指令（/help、/emote）
  - 聊天历史保存

- [ ] **UI/UX 优化**
  - 动画效果添加
  - 音效支持
  - 主题切换
  - 无障碍支持

- [ ] **移动端适配**
  - 响应式设计优化
  - 触摸交互支持
  - 移动端性能优化

### 运维功能
- [ ] **监控和日志**
  - 游戏运行监控
  - 错误日志收集
  - 性能指标收集
  - 玩家行为分析

- [ ] **部署优化**
  - Docker 容器化
  - 环境配置管理
  - 自动构建部署
  - 负载均衡支持

## 测试覆盖
- [x] **单元测试基础**
  - ConnectionManager.test.ts
  - accountStore.test.ts
  - playerManager.test.ts
  - remoteClient.test.ts
  - roomManager.test.ts

- [ ] **集成测试**
  - 完整游戏流程测试
  - 多玩家并发测试
  - 网络异常处理测试

- [ ] **E2E 测试**
  - 实际玩家交互测试
  - UI 自动化测试
  - 性能压力测试

## 文档完善
- [x] **README.md** - 项目概述和理念
- [x] **Memory Bank** - 项目文档（当前文件）
- [ ] **API 文档** - HTTP API 和 RPC 接口文档
- [ ] **开发指南** - 新开发者上手指南
- [ ] **部署指南** - 生产环境部署说明

## 近期目标
1. 完成对手区和玩家区 UI 组件
2. 重构服务器结构，分离关注点
3. 实现基本的游戏循环逻辑
4. 添加至少 3 种不同的卡牌类型
5. 完善错误处理和重连机制

## 里程碑
- **里程碑 1**：基础框架完成（✅ 已完成）
- **里程碑 2**：可玩的演示游戏（🚧 进行中）
- **里程碑 3**：完整的游戏功能（📋 待开始）
- **里程碑 4**：生产就绪（📋 待开始）