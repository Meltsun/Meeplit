## Meeplit Copilot Notes

### Big picture
- Monorepo (Bun + Vite) for a reverse-RPC tabletop demo: server drives gameplay by invoking browser-exposed methods; client does not initiate RPC to server.
- Socket.io with ack-based RPC and batching; Hono on Bun serves static assets and CORS gateway alongside the WS engine.
- Shared protocol/types in [packages/shared](packages/shared) (RPC contracts and `Card` base).

### Dev workflow
- Root scripts: `bun run s` starts the Bun server at [packages/server/main.ts](packages/server/main.ts); `bun run c` launches Vite using [packages/client/vite.config.ts](packages/client/vite.config.ts). Client also has `dev|build|preview|type-check`.
- Env from root `.env` via [packages/server/src/env.ts](packages/server/src/env.ts): `VITE_WS_HOST`, `VITE_WS_PORT`, `VITE_CLIENT_ORIGIN`; client dev port from `VITE_CLIENT_ORIGIN_PORT` with `envDir` pointed to repo root.
- Static assets are mounted at `/assets/*` from [packages](packages) by Hono; place images in [packages/assets](packages/assets) and reference like `/assets/test.png`.

### Client RPC surface
- [packages/client/src/game/ConnectionManager.ts](packages/client/src/game/ConnectionManager.ts) wires `rpc-call` (ack required) and `rpc-emit`; `safeCallMethod` wraps calls, coercing `undefined` results to `null` to preserve acks. Supports `rpc-batch` (`sequential|parallel`).
- Exposed service is `GameService` used in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue) via `manager.exposeRpcObject(gameService)`.
- `GameService` methods: `setGameInfo`, `ask(...): Promise<string>`, `ping`, `noReturnTest`, `updateCard(cards)` updates `handCards`, `playCard({cardnum, timeoutMs}): Promise<Card[]>` limits selection, prompts via `Ask`, returns selected or `[]`, and resets `maxSelection`; `getSelectedCards()` reads from `Player`.
- UI layout with slots in [packages/client/src/game/views/Layout.vue](packages/client/src/game/views/Layout.vue) (`gameInfo`, `chat`, `board`, `player`); `Chat` view is slotted and `ConnectionManager` includes a `chat` emit helper.

### Server RPC caller
- [packages/server/src/playerClient.ts](packages/server/src/playerClient.ts) provides `RemoteClient<T>`: `emit()` fire-and-forget; `call(timeout, default)` awaits ack with timeout/default fallback; `emitBatch`/`callBatch`/`batchAdvanced` send `rpc-batch` with `sequential|parallel` and can select a specific call’s result.
- Requests use `markRevivablePayload` so class instances round-trip; responses are handled by `handleResponse` and `reviveRehydratedValue`, mapping errors to `RpcErrorCode`.
- Example in [packages/server/main.ts](packages/server/main.ts): on socket connection, create `RemoteClient<GameService>`, `emit().updateCard(...)` and `emit().setGameInfo(...)`, then `call(15000, []).playCard({ cardnum: 1, timeoutMs: 10000 })` and run `play()` on returned cards.
- Hono serves `/assets/*` from repo `packages` and CORS for `CLIENT_ORIGIN` alongside the WS handler.

### Shared protocol
- [packages/shared/rpc.ts](packages/shared/rpc.ts) defines `RPC_BATCH_METHOD_NAME`, `RpcRequest`/`RpcResponse`, socket event contracts (`rpc-call`, `rpc-emit`, `chat`), and revivable helpers (`@Revivable`, `markRevivablePayload`, `reviveRehydratedValue`).
- [packages/shared/game.ts](packages/shared/game.ts) declares abstract `Card { id, img, name, play() }`; server card sample [packages/server/src/game/testCard.ts](packages/server/src/game/testCard.ts) sets `img: "/assets/test.png"` and overrides `play()`.

### Conventions & extending
- Client-exposed methods must not return `undefined` (use `null`), or acks may be lost.
- When crossing the wire with class instances, decorate bases with `@Revivable` so prototypes survive; mark outgoing payloads and revive incoming responses.
- Add new client-callable methods in `GameService` and expose via `ConnectionManager.exposeRpcObject(gameService)` in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue).
- On server, prefer `RemoteClient.call(timeoutMs, default)` for user input with timeouts; use batch helpers for grouped calls and specify `sequential|parallel`.
