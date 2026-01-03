# Meeplit Copilot Instructions

## Overview
- This repo is a Bun + Vite monorepo (workspaces) implementing reverse-RPC tabletop games: server drives turns by calling browser-exposed functions.
- Core idea: clients expose game actions; server orchestrates by invoking them via socket.io acknowledgements and batch calls.

## Packages to know
- [packages/client](packages/client) Vue 3 + Pinia frontend; entry mounts [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue) via [packages/client/src/main.ts](packages/client/src/main.ts).
- [packages/server](packages/server) Bun runtime hosting socket.io (bun-engine) + Hono for HTTP; orchestration in [packages/server/main.ts](packages/server/main.ts).
- [packages/shared](packages/shared/index.ts) shared RPC protocol types/constants (`RPC_BATCH_METHOD_NAME`, `RpcRequest`, `RpcResponse`, `ServerToClientEvents`, `ClientToServerEvents`).

## Dev workflow
- From repo root: `bun run s` starts the Bun server (binds ws using env `VITE_WS_HOST/PORT`).
- From repo root: `bun run c` starts the Vite client using [packages/client/vite.config.ts](packages/client/vite.config.ts) (envDir is repo root for `.env`).
- Client-only scripts inside package: `bun run dev|build|preview|type-check` (cwd `packages/client`).

## Reverse-RPC protocol
- Client is the RPC target. `GameManager` in [packages/client/src/game/GameManager.ts](packages/client/src/game/GameManager.ts) connects a socket.io client and registers `rpc-call` (ack) + `rpc-emit` handlers, dispatching to exposed methods.
- Safety: `safeCallMethod` resolves dotted paths, rejects prototype traps (`__proto__`, `constructor`, etc.), wraps results in `RpcResponse`, and logs service errors.
- Batch support: calling method name `rpc-batch` triggers sequential/parallel execution over a list of `RpcRequest`s.
- Server-side caller: `BrowserObjectCallServer` in [packages/server/src/browserObjectCallServer.ts](packages/server/src/browserObjectCallServer.ts) builds chainable proxies so the server can `.call`, `.emit`, or create batch requests; `callBatch` optionally extracts a specific result if returned request matches.

## Client surface (GameService)
- Game exposes `gameService` in [packages/client/src/game/Game.vue](packages/client/src/game/Game.vue): `setGameInfo(text)`, `ask(options)`, `ping()`, `noReturnTest()`. Extend here to add new RPC targets.
- `InputTest` UI in [packages/client/src/game/InputTest.vue](packages/client/src/game/InputTest.vue) handles `ask`: shows prompt/choices, resolves on click or `timeoutMs` with `defaultChoiceIndex` fallback.
- UI frame/layout lives in [packages/client/src/game/Layout.vue](packages/client/src/game/Layout.vue); uses Tailwind 4 classes and slots for `gameInfo`, `chat`, `opponent`, `board`, `ask`, `player` regions.

## Server usage pattern
- Server boot in [packages/server/main.ts](packages/server/main.ts): binds socket.io over Bun/Hono, on connection sets `server = new BrowserObjectCallServer<GameService>(socket)`.
- Example flow (`test()`): sequential `callBatch` of `ping`, `setGameInfo`, then `ask` with timeout/default; logs result. Use this as template for orchestrating turns.
- CORS allowed origins driven by env `CLIENT_ORIGIN` (default `http://localhost:5173`).

## Env/config
- Root `.env` (loaded by both Vite and Bun via [packages/server/src/env.ts](packages/server/src/env.ts)): `VITE_WS_HOST`, `VITE_WS_PORT`, optionally `CLIENT_ORIGIN` for CORS.
- Vite config disables dependency pre-bundling sourcemaps to ease debugging; root set to `packages/client` with alias `@` -> `src`.

## Extending/adding RPC methods
- Add method to `gameService` and expose via `GameManager.exposeRpcObject`; update `GameService` type export in [packages/client/src/main.ts](packages/client/src/main.ts) if signature changes.
- Server side: use `BrowserObjectCallServer<GameService>` to gain typed stubs; batch when you need ordered/parallel operations.
- Keep methods pure/async-friendly; return `null` instead of `undefined` to avoid ack drop, mirroring `safeCallMethod` behavior.

## Debugging tips
- RPC errors surface in console logs on both sides; `RpcError` codes map to InvalidRequest/MethodNotFound/ServiceError/InternalError.
- If ack is missing in `rpc-call`, client logs a warning; ensure `ack` is passed when emitting from server.
