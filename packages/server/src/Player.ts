import type { Socket } from "socket.io";
import { RemoteClient } from "./playerClient";
import type GameService from "@meeplit/client";

/**
 * Player represents a connected (or connectable) user.
 * It centralizes identity (playerId, sessionId), display name,
 * socket binding info, per-room membership and readiness.
 *
 * TODO:
 * - Persist players (DB) and support reconnection across restarts.
 * - Add auth fields (e.g., token) when moving beyond demo mode.
 */
export default class Player {
    readonly playerId: string;
    readonly sessionId: string;
    name: string;

    // Socket.io binding (set when the user connects the WS)
    socketId?: string;
    client?: RemoteClient<GameService>;

    // Room membership
    roomId?: string;
    seatIndex?: number;
    ready: boolean = false;

    constructor(args: { playerId: string; sessionId: string; name: string }) {
        this.playerId = args.playerId;
        this.sessionId = args.sessionId;
        this.name = args.name;
    }

    bindSocket(socket: Socket) {
        this.socketId = socket.id;
        this.client = new RemoteClient<GameService>(socket);
    }

    unbindSocket() {
        this.socketId = undefined;
        this.client = undefined;
    }

    joinRoom(roomId: string, seatIndex: number) {
        this.roomId = roomId;
        this.seatIndex = seatIndex;
        this.ready = false;
    }

    leaveRoom() {
        this.roomId = undefined;
        this.seatIndex = undefined;
        this.ready = false;
    }

    markReady(ready = true) {
        this.ready = ready;
    }
}
