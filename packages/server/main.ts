import { Server } from "socket.io";
import { Server as Engine } from "@socket.io/bun-engine";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";

import { CLIENT_ORIGIN, WS_HOST, WS_PORT, WS_URL } from "./src/env";
import * as Cards from "./src/game";
import Player from "./src/Player";
import PlayerManager from "./src/PlayerManager";
import RoomManager, { Room } from "./src/RoomManager";
import AccountStore from "./src/AccountStore";

import type GameService from "@meeplit/client"

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
// app.use('/assets/*', cors({ origin: CLIENT_ORIGIN ?? '*', allowMethods: ['GET', 'HEAD', 'OPTIONS'] }));
app.use('/assets/*', serveStatic({ root:"D:/Script/Meeplit/packages" }));

// Managers
const players = new PlayerManager();
const accounts = new AccountStore("./packages/server/data/accounts.db");
const rooms = new RoomManager({
    randomId: (p) => players.randomId(p),
    onAllReadyStart: (room) => startRoomGame(room),
});

// Health check
app.get('/api/health', (c) => c.json({ ok: true, ws: WS_URL }));

// Login with account verification (SQLite)
app.post('/api/login', async (c) => {
    try {
        const body = await c.req.json<{ name?: string; password?: string }>();
        const name = (body.name ?? '').trim();
        const password = (body.password ?? '').trim();
        if (!name || !password) return c.json({ error: 'InvalidPayload' }, 400);

        const account = accounts.verifyCredentials(name, password);
        if (!account) return c.json({ error: 'InvalidCredentials' }, 401);

        const player = players.create(account.name);
        // TODO: Set cookie instead of requiring header (hono/cookie)
        return c.json({ sessionId: player.sessionId, user: { id: player.playerId, name: player.name } });
    } catch {
        return c.json({ error: 'InvalidPayload' }, 400);
    }
});

// Who am I
app.get('/api/me', (c) => {
    const sid = c.req.header('x-session-id');
    const player = players.getBySession(sid ?? undefined);
    if (!player) return c.json({ user: null });
    return c.json({ user: { id: player.playerId, name: player.name }, roomId: player.roomId ?? null });
});

// List rooms
app.get('/api/rooms', (c) => {
    return c.json({ rooms: rooms.listSummaries() });
});

// Create room
app.post('/api/rooms', async (c) => {
    const sid = c.req.header('x-session-id');
    const player = players.getBySession(sid ?? undefined);
    if (!player) return c.json({ error: 'Unauthorized' }, 401);
    try {
        const body = await c.req.json<{ name?: string,capacity:number }>();
        const room = rooms.create(body.name, body.capacity ?? 4);
        return c.json({ room: rooms.summaryOf(room) }, 201);
    } catch {
        return c.json({ error: 'InvalidPayload' }, 400);
    }
});

// Join room (HTTP-level membership; RPC binding occurs on socket connection)
app.post('/api/rooms/:id/join', async (c) => {
    const sid = c.req.header('x-session-id');
    const player = players.getBySession(sid ?? undefined);
    if (!player) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    const room = rooms.join(id, player);
    if (!room) return c.json({ error: 'RoomNotFound' }, 404);
    // NOTE: RPC binding happens when the player connects the socket with this session.
    return c.json({ ok: true, room: rooms.summaryOf(room) });
});

// Mark ready within a room
app.post('/api/rooms/:id/ready', async (c) => {
    const sid = c.req.header('x-session-id');
    const player = players.getBySession(sid ?? undefined);
    if (!player) return c.json({ error: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    if (!player.client) return c.json({ error: 'SocketNotConnected' }, 400);
    const { room } = rooms.markReady(id, player);
    if (!room) return c.json({ error: 'RoomNotFound' }, 404);
    return c.json({ ok: true, ready: room.ready.size, size: room.clients.size, state: room.state });
});

// Room state
app.get('/api/rooms/:id/state', (c) => {
    const id = c.req.param('id');
    const room = rooms.get(id);
    if (!room) return c.json({ error: 'RoomNotFound' }, 404);
    return c.json({ room: rooms.summaryOf(room) });
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

socketioServer.on("connection", async (socket) => {
    console.log("Reverse RPC client connected", socket.id);
    // Bind session via socket.io auth or query
    const sid = (socket.handshake.auth as any)?.sessionId
        ?? (socket.handshake.query as any)?.sessionId;

    const player = players.bindSocket(sid, socket);
    if (player && player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
            room.clients.set(player.playerId, player);
            player.client?.emit().setGameInfo(JSON.stringify(room))
        }
    }

    socket.on("disconnect", () => {
        const p = players.unbindSocket(socket);
        if (p) rooms.cleanupOnDisconnect(p);
    });
});

// Example room game loop (skeleton)
// NOTE: This demonstrates per-room control using RPC; adapt to your game.
async function startRoomGame(room: Room) {
    // TODO: Implement actual room-scoped game controller
    // - Deal cards per player
    // - Drive turns
    // - Handle timeouts and round transitions
    const sampleCards = [new Cards.TestCard(), new Cards.TestCard(), new Cards.TestCard()];
    for (const player of room.clients.values()) {
        player.client?.emit().setGameInfo(JSON.stringify(room))
    }
}