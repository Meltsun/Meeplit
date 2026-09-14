import type { Room } from "../lobby/RoomManager";

/**
 * 将房间座位表（seatIndex -> Player）投影为客户端使用的座位数组。
 * 数组下标为座位号，元素为玩家 ID 或 null（空座）。
 */
export function buildPlayersArray(room: Room): Array<string | null> {
    const arr = Array<string | null>(room.capacity).fill(null);
    for (const [seat, player] of room.playersMap.entries()) {
        arr[seat] = player.playerId;
    }
    return arr;
}
