## Meeplit Copilot Notes

### Big picture
- Monorepo (Bun + Vite) running a reverse-RPC tabletop demo: server invokes browser-exposed methods; client never initiates RPC to server.
- Socket.io with ack-based RPC plus batching; Hono serves static assets and CORS gateway at the same Bun server.
- Shared protocol/types live in [packages/shared](packages/shared) (RPC contracts and card interface).

### Dev workflow
- Root scripts: `bun run s` runs [packages/server/main.ts](packages/server/main.ts); `bun run c` starts Vite via [packages/client/vite.config.ts](packages/client/vite.config.ts); client workspace also has `bun run dev|build|preview|type-check`.
- Env is loaded from root `.env` by [packages/server/src/env.ts](packages/server/src/env.ts): `VITE_WS_HOST`, `VITE_WS_PORT`, `VITE_CLIENT_ORIGIN`; Vite dev port comes from `VITE_CLIENT_ORIGIN_PORT`. Client `envDir` points to repo root.
- Static files mount at `/assets/*` from [packages](packages); add images under [packages/assets](packages/assets) and reference with that path.

### RPC surface exposed by client
- [packages/client/src/game/ConnectionManager.ts](packages/client/src/game/ConnectionManager.ts) registers `rpc-call` (ack required) and `rpc-emit`; calls `safeCallMethod` and coerces `undefined` results to `null` to keep acks alive. Batches go through the same handler when `method === rpc-batch`.
- [packages/client/src/game/GameController.ts](packages/client/src/game/GameController.ts) is the exposed service in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue); holds refs `gameInfoText`, `playerCards`, `maxSelection`, and component refs `inputComponent`, `playerComponent`.
  - `setGameInfo`, `ping`, `noReturnTest` trivial endpoints.
  - `ask` delegates to [packages/client/src/game/InputTest.vue](packages/client/src/game/InputTest.vue) `getInput` (prompt + choices; supports ref/computed choices, columns, timeout returning `defaultChoice`).
  - `updateCard` rewrites `img` via `resolveCardImg` using `VITE_WS_HOST/PORT` then updates `playerCards`.
  - `playCard` limits selection via `maxSelection`, asks via `InputTest` with `出牌/取消`, returns selected `Card[]` or `[]`; resets selection cap afterward.
  - `getSelectedCards` reads from [packages/client/src/game/Player.vue](packages/client/src/game/Player.vue) (`getSelectedIds` exposes selected indices).

### RPC caller on server
- [packages/server/src/playerClient.ts](packages/server/src/playerClient.ts) builds `RemoteClient<T>` proxy: `emit()` fire-and-forget; `call(timeout, default)` waits for ack with timeout/default fallback; `emitBatch`/`callBatch`/`batchAdvanced` send `rpc-batch` (`sequential|parallel`) and optionally extract a specific call’s result.
- Requests are marked via `markRevivablePayload` so class instances round-trip; responses go through `handleResponse`/`reviveRehydratedValue` and map errors to `RpcErrorCode`.
- Example flow in [packages/server/main.ts](packages/server/main.ts): on socket connection, create `RemoteClient<GameService>`, emit `updateCard`/`setGameInfo`, then `call(...).playCard` with timeout/default `[]` and invoke `play()` on returned cards.
- Card classes live in [packages/server/src/game/testCard.ts](packages/server/src/game/testCard.ts) (`@Revivable` `TestCard` extends `CardBase`) and are exported via [packages/server/src/game/index.ts](packages/server/src/game/index.ts).

### Shared protocol
- [packages/shared/rpc.ts](packages/shared/rpc.ts) defines `RPC_BATCH_METHOD_NAME`, `RpcRequest`/`RpcResponse`, error codes, socket event contracts, and revivable serialization helpers (`@Revivable`, `markRevivablePayload`, `reviveRehydratedValue`).
- [packages/shared/game.ts](packages/shared/game.ts) declares `Card { id, img, name, play() }` used across server/client.

### Extending
- Add client-callable methods to `GameController` and expose via `ConnectionManager.exposeRpcObject(controller)` in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue); ensure methods return non-`undefined`.
- Use `RemoteClient` helpers for new server orchestration to keep timeout/error/batch handling consistent; decorate serializable classes with `@Revivable` if methods/prototypes must survive round-trip.
