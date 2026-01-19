## Meeplit Copilot Notes
请用中文回答
### Big picture
- Monorepo using Bun runtime with Vite + Vue 3 client and Hono + Socket.io server; reverse-RPC means the server drives gameplay by invoking browser-exposed methods (browser never initiates RPC back).
- Shared protocol/types live in [packages/shared](packages/shared) for RPC envelopes, revivers, `Card` base, and chat shapes; keep cross-cutting types here.
- Static assets are served from [packages/assets](packages/assets) at `/assets/*` (absolute root currently `D:/Script/Meeplit/packages`).

### Dev workflow
- Package manager is Bun: `bun run s` (watch server [packages/server/main.ts](packages/server/main.ts)), `bun run c` (Vite via [packages/client/vite.config.ts](packages/client/vite.config.ts)), `bun test` hits [packages/server/test.ts](packages/server/test.ts). Add/adjust tests when touching server logic.
- Env comes from root `.env` read in [packages/server/src/env.ts](packages/server/src/env.ts): `VITE_WS_HOST`, `VITE_WS_PORT`, `VITE_CLIENT_ORIGIN`, `VITE_CLIENT_ORIGIN_PORT` (client dev server port). Client `envDir` also points to repo root.
- Tailwind CSS v4 is enabled via `@tailwindcss/vite`; utilities like `w-90` alias `w-[360px]` are valid.

### Client surface
- App flow in [packages/client/src/Main.vue](packages/client/src/Main.vue): `auth` → `lobby` → `play`; session id is saved to `localStorage` and sent as `x-session-id` for HTTP. Auth bindings live in [packages/client/src/views/AuthView.vue](packages/client/src/views/AuthView.vue).
- Lobby HTTP calls: `/api/rooms`, `/api/rooms/:id/join`, `/api/rooms` POST (capacity+name); readiness occurs after WS bind.
- Gameplay wiring in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue) connects `ConnectionManager` to `GameService`; chat uses `sendChatMessage()` which requires socket ack.
- RPC handler [packages/client/src/game/ConnectionManager.ts](packages/client/src/game/ConnectionManager.ts) routes `rpc-call`/`rpc-emit` to `safeCallMethod`; it coerces `undefined` to `null` for acks and supports `rpc-batch` sequential/parallel dispatch.
- Server-invokable methods in [packages/client/src/game/GameService.ts](packages/client/src/game/GameService.ts): `setGameInfo`, `ask` via [packages/client/src/game/views/Ask.vue](packages/client/src/game/views/Ask.vue), `ping`, `noReturnTest`, `updateCard`, `playCard({cardnum, timeoutMs})` limiting selection then resetting `maxSelection`, `getSelectedCards`, `addChatMessage` to append chat.
- UI shell targets 1440×810 and scales in [packages/client/src/main.ts](packages/client/src/main.ts); slots in [packages/client/src/game/views/Layout.vue](packages/client/src/game/views/Layout.vue) feed `gameInfo`, `chat`, `board`, `player` regions.

### Server surface
- HTTP API in [packages/server/main.ts](packages/server/main.ts): `/api/login`, `/api/me`, `/api/rooms` list/create, `/api/rooms/:id/join`, `/api/rooms/:id/ready`, `/api/rooms/:id/state`; all expect `x-session-id`. Accounts seeded in SQLite via [packages/server/src/AccountStore.ts](packages/server/src/AccountStore.ts) for users `alice|bob|charlie` with `alice123|bob123|charlie123`.
- Player/session handling in [packages/server/src/PlayerManager.ts](packages/server/src/PlayerManager.ts) + [packages/server/src/Player.ts](packages/server/src/Player.ts); sockets bind on connect using `sessionId` from auth/query.
- Room lifecycle in [packages/server/src/RoomManager.ts](packages/server/src/RoomManager.ts); `markReady` flips to `playing` and calls `onAllReadyStart` (stub `startRoomGame` in main for now).
- RPC helper [packages/server/src/playerClient.ts](packages/server/src/playerClient.ts) offers `emit`, `call(timeout, default)`, `emitBatch`/`callBatch`/`batchAdvanced` (return the picked request). Use `markRevivablePayload` before sending class instances and `reviveRehydratedValue` on responses.

### Shared conventions
- [packages/shared/rpc.ts](packages/shared/rpc.ts) defines RPC envelopes, `RPCErrorCode`, socket event contracts, and `RPC_BATCH_METHOD_NAME`.
- [packages/shared/game.ts](packages/shared/game.ts) has `Card` base (auto `id`, `img`, `name`, optional `description_url`, `play` hook); sample card at [packages/server/src/game/testCard.ts](packages/server/src/game/testCard.ts) uses `/assets/test.png`.
- Client-exposed RPC methods must never return `undefined`; return `null` instead so acks are honored. Revivable types must be decorated with `@Revivable` and wrapped with `markRevivablePayload` when sent.
