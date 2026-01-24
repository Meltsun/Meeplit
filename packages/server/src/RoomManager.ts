import Player from "./Player";

export type RoomState = 'waiting' | 'playing' | 'finished';

export interface Room {
    id: string;
    name: string;
    state: RoomState;
    capacity: number;
    playersMap: Map<number, Player>; // key: seat index
    ready: Set<string>; // playerId that marked ready
}

export interface RoomSummary {
    id: string;
    name: string;
    state: RoomState;
    capacity: number;
    size: number;
    ready: number;
}

export default class RoomManager {
    private rooms = new Map<string, Room>();

    constructor(
        private opts: {
            onAllReadyStart?: (room: Room) => Promise<void> | void;
            randomId?: (prefix?: string) => string;
        } = {}
    ) { }

    private randomId(prefix = '') {
        return this.opts.randomId?.(prefix) ?? `${prefix}${Math.random().toString(36).slice(2, 10)}`;
    }

    create(name?: string, capacity = 4) {
        const cap = Math.max(1, capacity);
        const id = this.randomId('room_');
        const room: Room = {
            id,
            name: (name ?? `Room ${id.slice(-4)}`).trim(),
            state: 'waiting',
            capacity: cap,
            playersMap: new Map(),
            ready: new Set(),
        };
        this.rooms.set(id, room);
        return room;
    }

    get(id: string) {
        return this.rooms.get(id);
    }

    listSummaries(): RoomSummary[] {
        return Array.from(this.rooms.values()).map((r) => this.summaryOf(r));
    }

    summaryOf(room: Room): RoomSummary {
        return {
            id: room.id,
            name: room.name,
            state: room.state,
            capacity: room.capacity,
            size: room.playersMap.size,
            ready: room.ready.size,
        };
    }

    join(roomId: string, player: Player) {
        const room = this.get(roomId);
        if (!room) return undefined;
        if (room.playersMap.size >= room.capacity) return undefined;

        const emptySeats: number[] = [];
        for (let i = 0; i < room.capacity; i += 1) {
            if (!room.playersMap.has(i)) emptySeats.push(i);
        }
        if (!emptySeats.length) return undefined;

        const seat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
        player.joinRoom(roomId, seat);
        room.playersMap.set(seat, player);
        room.ready.delete(player.playerId);
        return { room, seat };
    }

    markReady(roomId: string, player: Player) {
        const room = this.get(roomId);
        if (!room) return { room: undefined, allReady: false };
        if (player.roomId !== roomId) return { room, allReady: false };
        player.markReady(true);
        room.ready.add(player.playerId);
        const allReady = room.ready.size > 0 && room.ready.size === room.playersMap.size;
        if (allReady && room.state === 'waiting') {
            room.state = 'playing';
            // Start game loop if provided
            this.opts.onAllReadyStart?.(room);
        }
        return { room, allReady };
    }

    resetReady(room: Room) {
        // Clear per-player ready flags and room ready set.
        room.ready.clear();
        for (const player of room.playersMap.values()) player.markReady(false);
        room.state = 'waiting';
    }

    cleanupOnDisconnect(player: Player) {
        if (!player.roomId) return { room: undefined, seat: undefined };
        const room = this.rooms.get(player.roomId);
        if (!room) return { room: undefined, seat: undefined };

        let seat = player.seatIndex;
        if (seat === undefined) {
            for (const [s, p] of room.playersMap.entries()) {
                if (p.playerId === player.playerId) {
                    seat = s;
                    break;
                }
            }
        }

        if (seat !== undefined) room.playersMap.delete(seat);
        room.ready.delete(player.playerId);
        player.leaveRoom();
        return { room, seat };
    }
}
