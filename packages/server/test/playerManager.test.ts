import { describe, expect, test } from "bun:test";
import Player from "../src/Player";
import PlayerManager from "../src/PlayerManager";

const createSocketStub = () => {
    const socket = {
        id: "sock-1",
        on: (_event: string, _handler: (...args: any[]) => void) => {
            /* no-op */
        },
        emit: (_event: string, _payload: unknown) => {
            /* no-op */
        },
        timeout: (_ms: number) => ({
            emitWithAck: (_event: string, _payload: unknown) => Promise.resolve({ result: null }),
        }),
    } as any;
    return socket;
};

describe("Player", () => {
    test("tracks room membership and readiness", () => {
        const player = new Player({ playerId: "p1", sessionId: "s1", name: "neo" });
        player.joinRoom("room-a");
        expect(player.roomId).toBe("room-a");
        expect(player.ready).toBe(false);

        player.markReady(true);
        expect(player.ready).toBe(true);

        player.leaveRoom();
        expect(player.roomId).toBeUndefined();
        expect(player.ready).toBe(false);
    });
});

describe("PlayerManager", () => {
    test("creates and looks up players by id and session", () => {
        const mgr = new PlayerManager();
        const player = mgr.create("trinity");

        expect(mgr.getBySession(player.sessionId)).toBe(player);
        expect(mgr.getById(player.playerId)).toBe(player);
    });

    test("binds and unbinds sockets", () => {
        const mgr = new PlayerManager();
        const player = mgr.create("morpheus");
        const socket = createSocketStub();

        const bound = mgr.bindSocket(player.sessionId, socket);
        expect(bound).toBe(player);
        expect(mgr.getBySocket(socket.id)).toBe(player);

        const unbound = mgr.unbindSocket(socket);
        expect(unbound).toBe(player);
        expect(mgr.getBySocket(socket.id)).toBeUndefined();
        expect(player.socketId).toBeUndefined();
    });
});
