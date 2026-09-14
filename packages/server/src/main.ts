import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

import { CLIENT_ORIGIN, WS_HOST, WS_PORT, WS_URL } from "./env";
import PlayerManager from "./lobby/PlayerManager";
import RoomManager from "./lobby/RoomManager";
import AccountStore from "./lobby/AccountStore";
import { registerLobbyRoutes } from "./lobby/routes";
import { handleConnection } from "./lobby/connection";
import { startRoomGame } from "./games/testcard";

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

console.log('Server will bind WS on', WS_HOST, WS_PORT, 'ws-url', WS_URL);

const socketioServer = new Server();
const engine = new Engine({
    cors: {
        origin: CLIENT_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    },
});

socketioServer.bind(engine);

const app = new Hono();

app.use('*', cors());
app.use('/assets/*', serveStatic({ root: SERVER_ROOT }));

// 依赖装配：局外管理器与 TestCard 游戏控制器
const playerManager = new PlayerManager();
const accounts = new AccountStore("./packages/server/data/accounts.db");
const rooms = new RoomManager({
    randomId: (p) => playerManager.randomId(p),
    onAllReadyStart: (room) => startRoomGame(room),
});

// 局外 HTTP 路由
registerLobbyRoutes(app, { playerManager, accounts, rooms });

// socket.io 连接处理（反向 RPC 绑定、聊天、断线清理）
socketioServer.on("connection", (socket) => {
    handleConnection(socket, { playerManager, rooms });
});

const { websocket } = engine.handler();

Bun.serve({
    port: WS_PORT,
    idleTimeout: 30,
    fetch(req: Request, server: Bun.Server<any>) {
        const url = new URL(req.url);
        if (url.pathname === "/socket.io/") {
            return engine.handleRequest(req, server);
        }
        return app.fetch(req, server);
    },
    websocket
});
