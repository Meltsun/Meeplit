<script setup lang="ts">
import { computed } from 'vue';

interface RoomSummary {
    id: string;
    name: string;
    state: string;
    size: number;
    ready: number;
    capacity: number;
}

const props = defineProps<{
    rooms: RoomSummary[];
    newRoomName: string;
    roomCapacity: number;
}>();
const emit = defineEmits<{
    (e: 'refresh'): void;
    (e: 'join', roomId: string): void;
    (e: 'create'): void;
    (e: 'update:newRoomName', val: string): void;
    (e: 'update:roomCapacity', val: number): void;
}>();

const newRoomNameModel = computed({
    get: () => props.newRoomName,
    set: (val: string) => emit('update:newRoomName', val),
});

const roomCapacityModel = computed({
    get: () => props.roomCapacity,
    set: (val: number) => emit('update:roomCapacity', val),
});
</script>

<template>
    <section class="panel flex flex-col gap-4">
        <div class="panel-header flex items-center justify-between">
            <h2 class="text-lg font-semibold">房间列表</h2>
            <button class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20" @click="emit('refresh')">刷新</button>
        </div>
        <ul class="list-none p-0 m-0 flex flex-col gap-2">
            <li v-for="room in props.rooms" :key="room.id" class="flex items-center justify-between px-3 py-2 rounded-md border border-white/10 bg-white/5">
                <div class="flex items-center gap-2">
                    <strong>{{ room.name }}</strong>
                    <span class="opacity-80 text-sm">({{ room.ready }}/{{ room.size }}/{{ room.capacity }}) [{{ room.state }}]</span>
                </div>
                <button @click="emit('join', room.id)">加入</button>
            </li>
        </ul>
        <div class="flex items-center gap-3">
            <input
                v-model="newRoomNameModel"
                placeholder="新房间名"
                class="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/40"
            />
            <label class="text-sm opacity-80">人数</label>
            <input
                type="number"
                min="1"
                max="8"
                v-model.number="roomCapacityModel"
                class="w-16 rounded-md border border-white/15 bg-white/5 px-2 py-2 text-white outline-none focus:border-white/40"
            />
            <button class="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20" @click="emit('create')">创建房间</button>
        </div>
    </section>
</template>
