import type { Room } from "../../lobby/RoomManager";
import { TestCard } from "./cards";

/**
 * TestCard 房间游戏主循环（骨架）。
 * 通过反向 RPC 驱动整局游戏：发牌、轮转回合、超时与阶段切换。
 */
export async function startRoomGame(room: Room): Promise<void> {
    // TODO: Implement actual room-scoped game controller
    // - Deal cards per player
    // - Drive turns
    // - Handle timeouts and round transitions
    const sampleCards = [new TestCard(), new TestCard(), new TestCard()];
    for (const player of room.playersMap.values()) {
        player.client?.emit().setGameInfo(`开始游戏${room.id}`);
    }
}
