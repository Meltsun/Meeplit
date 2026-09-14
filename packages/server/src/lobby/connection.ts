import type { Socket } from "socket.io";
import type PlayerManager from "./PlayerManager";
import type RoomManager from "./RoomManager";
import { buildPlayersArray } from "../game/helpers";
import { TestCard, UnknownCard } from "../games/testcard";

/** socket.io 连接处理的依赖集合 */
export interface ConnectionDeps {
    playerManager: PlayerManager;
    rooms: RoomManager;
}

/**
 * 处理一个 socket.io 连接：
 * - 通过 sessionId 绑定玩家，恢复房间座位
 * - 注册聊天广播
 * - 通知房间内其他玩家（人数快照、入房系统消息、初始卡牌）
 * - 断线时清理房间成员并广播
 */
export function handleConnection(socket: Socket, deps: ConnectionDeps) {
    const { playerManager, rooms } = deps;
    console.log("Reverse RPC client connected", socket.id);

    // Bind session via socket.io auth or query
    const sid = (socket.handshake.auth as any)?.sessionId
        ?? (socket.handshake.query as any)?.sessionId;

    const newPlayer = playerManager.addPlayer(sid, socket);
    if (newPlayer && newPlayer.roomId) {
        const room = rooms.get(newPlayer.roomId);
        if (room) {
            if (newPlayer.seatIndex !== undefined && !room.playersMap.has(newPlayer.seatIndex)) {
                room.playersMap.set(newPlayer.seatIndex, newPlayer);
            }

            const playersSnapshot = buildPlayersArray(room);

            newPlayer.client?.emit().setPlayerInfo({
                id: newPlayer.playerId,
                name: newPlayer.name,
            });

            socket.on("chat", (message: string, ack) => {
                console.log("收到聊天消息:", message);
                for (const p of room.playersMap.values()) {
                    p.client?.emit().addChatMessage(
                        {
                            type: "player",
                            playerId: newPlayer.playerId,
                            playerName: newPlayer.name,
                            text: message,
                            timeStamp: Date.now(),
                        }
                    );
                }
            });

            for (const p of room.playersMap.values()) {
                p.client?.emitBatch("sequential", (stub) => {
                    stub.addChatMessage(
                        {
                            type: "system",
                            text: `${newPlayer.name} 加入了房间`,
                            timeStamp: Date.now(),
                        }
                    );
                    stub.setPlayers(playersSnapshot);
                    stub.updateCard([new UnknownCard(), new TestCard()]);
                });
            }
        }
    }

    socket.on("disconnect", () => {
        const p = playerManager.unbindSocket(socket);
        if (!p) return;
        const { room } = rooms.cleanupOnDisconnect(p);
        if (room) {
            const playersSnapshot = buildPlayersArray(room);
            for (const other of room.playersMap.values()) {
                other.client?.emit().setPlayers(playersSnapshot);
            }
        }
    });
}
