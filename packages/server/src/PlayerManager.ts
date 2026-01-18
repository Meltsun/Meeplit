import type { Socket } from "socket.io";
import Player from "./Player";

export default class PlayerManager {
    private byId = new Map<string, Player>();
    private bySession = new Map<string, Player>();
    private bySocket = new Map<string, Player>();

    randomId(prefix = ''): string {
        return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
    }

    create(name: string) {
        const sessionId = this.randomId('sess_');
        const playerId = this.randomId('p_');
        const player = new Player({ playerId, sessionId, name });
        this.bySession.set(sessionId, player);
        this.byId.set(playerId, player);
        return player;
    }

    getBySession(sessionId?: string) {
        return sessionId ? this.bySession.get(sessionId) : undefined;
    }

    getById(playerId: string) {
        return this.byId.get(playerId);
    }

    getBySocket(socketId: string) {
        return this.bySocket.get(socketId);
    }

    bindSocket(sessionId: string | undefined, socket: Socket) {
        if (!sessionId) return undefined;
        const player = this.bySession.get(sessionId);
        if (!player) return undefined;
        player.bindSocket(socket);
        this.bySocket.set(socket.id, player);
        return player;
    }

    unbindSocket(socket: Socket) {
        const player = this.bySocket.get(socket.id);
        if (!player) return undefined;
        this.bySocket.delete(socket.id);
        player.unbindSocket();
        return player;
    }
}
