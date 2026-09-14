import type { Hono } from "hono";
import { WS_URL } from "../env";
import type AccountStore from "./AccountStore";
import type PlayerManager from "./PlayerManager";
import type RoomManager from "./RoomManager";

/** 局外 HTTP 路由的依赖集合 */
export interface LobbyDeps {
    playerManager: PlayerManager;
    accounts: AccountStore;
    rooms: RoomManager;
}

/**
 * 在 Hono 应用上注册局外管理的 HTTP 路由
 * （健康检查、登录、会话查询、房间列表/创建/加入/准备/状态）。
 */
export function registerLobbyRoutes(app: Hono, deps: LobbyDeps) {
    const { playerManager, accounts, rooms } = deps;

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

            const player = playerManager.create(account.name);
            // TODO: Set cookie instead of requiring header (hono/cookie)
            return c.json({ sessionId: player.sessionId, user: { id: player.playerId, name: player.name } });
        } catch {
            return c.json({ error: 'InvalidPayload' }, 400);
        }
    });

    // Who am I
    app.get('/api/me', (c) => {
        const sid = c.req.header('x-session-id');
        const player = playerManager.getBySession(sid ?? undefined);
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
        const player = playerManager.getBySession(sid ?? undefined);
        if (!player) return c.json({ error: 'Unauthorized' }, 401);
        try {
            const body = await c.req.json<{ name?: string; capacity: number }>();
            const room = rooms.create(body.name, body.capacity ?? 4);
            return c.json({ room: rooms.summaryOf(room) }, 201);
        } catch {
            return c.json({ error: 'InvalidPayload' }, 400);
        }
    });

    // Join room (HTTP-level membership; RPC binding occurs on socket connection)
    app.post('/api/rooms/:id/join', async (c) => {
        const sid = c.req.header('x-session-id');
        const player = playerManager.getBySession(sid ?? undefined);
        if (!player) return c.json({ error: 'Unauthorized' }, 401);
        const id = c.req.param('id');
        const joinRes = rooms.join(id, player);
        if (!joinRes) return c.json({ error: 'RoomNotFound' }, 404);
        // NOTE: RPC binding happens when the player connects the socket with this session.
        return c.json({ ok: true, room: rooms.summaryOf(joinRes.room) });
    });

    // Mark ready within a room
    app.post('/api/rooms/:id/ready', async (c) => {
        const sid = c.req.header('x-session-id');
        const player = playerManager.getBySession(sid ?? undefined);
        if (!player) return c.json({ error: 'Unauthorized' }, 401);
        const id = c.req.param('id');
        if (!player.client) return c.json({ error: 'SocketNotConnected' }, 400);
        const { room } = rooms.markReady(id, player);
        if (!room) return c.json({ error: 'RoomNotFound' }, 404);
        return c.json({ ok: true, ready: room.ready.size, size: room.playersMap.size, state: room.state });
    });

    // Room state
    app.get('/api/rooms/:id/state', (c) => {
        const id = c.req.param('id');
        const room = rooms.get(id);
        if (!room) return c.json({ error: 'RoomNotFound' }, 404);
        return c.json({ room: rooms.summaryOf(room) });
    });
}
