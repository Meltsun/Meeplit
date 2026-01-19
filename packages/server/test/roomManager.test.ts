import { describe, expect, test, vi } from "bun:test";
import Player from "../src/Player";
import RoomManager from "../src/RoomManager";

describe("RoomManager", () => {
    test("creates rooms with defaults and enforces capacity floor", () => {
        const rm = new RoomManager();
        const room = rm.create(undefined, 0);
        expect(room.capacity).toBe(1);
        expect(room.state).toBe("waiting");
        expect(room.clients.size).toBe(0);
    });

    test("allows players to join when capacity permits", () => {
        const rm = new RoomManager();
        const room = rm.create("Alpha", 2);
        const p1 = new Player({ playerId: "p1", sessionId: "s1", name: "one" });
        const p2 = new Player({ playerId: "p2", sessionId: "s2", name: "two" });

        expect(rm.join(room.id, p1)).toBe(room);
        expect(room.clients.size).toBe(1);

        expect(rm.join(room.id, p2)).toBe(room);
        expect(room.clients.size).toBe(2);

        const p3 = new Player({ playerId: "p3", sessionId: "s3", name: "three" });
        expect(rm.join(room.id, p3)).toBeUndefined();
        expect(room.clients.size).toBe(2);
    });

    test("marks ready, transitions to playing, and invokes start hook", () => {
        const onAllReadyStart = vi.fn();
        const rm = new RoomManager({ onAllReadyStart });
        const room = rm.create("Beta", 2);
        const p1 = new Player({ playerId: "p1", sessionId: "s1", name: "one" });
        const p2 = new Player({ playerId: "p2", sessionId: "s2", name: "two" });

        rm.join(room.id, p1);
        rm.join(room.id, p2);

        const first = rm.markReady(room.id, p1);
        expect(first.allReady).toBe(false);
        expect(room.state).toBe("waiting");

        const second = rm.markReady(room.id, p2);
        expect(second.allReady).toBe(true);
        expect(room.state).toBe("playing");
        expect(onAllReadyStart).toHaveBeenCalledTimes(1);
    });

    test("cleans up ready and membership state", () => {
        const rm = new RoomManager();
        const room = rm.create("Gamma", 2);
        const p1 = new Player({ playerId: "p1", sessionId: "s1", name: "one" });
        const p2 = new Player({ playerId: "p2", sessionId: "s2", name: "two" });

        rm.join(room.id, p1);
        rm.join(room.id, p2);
        rm.markReady(room.id, p1);
        rm.markReady(room.id, p2);

        rm.cleanupOnDisconnect(p1);
        expect(room.clients.has(p1.playerId)).toBe(false);
        expect(room.ready.has(p1.playerId)).toBe(false);

        rm.resetReady(room);
        expect(room.ready.size).toBe(0);
        expect(room.state).toBe("waiting");
        expect(p2.ready).toBe(false);
    });
});
