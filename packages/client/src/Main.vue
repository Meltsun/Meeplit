<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Game from '@/game/Game.vue';
import AuthView from '@/views/AuthView.vue';
import LobbyView from '@/views/LobbyView.vue';
import '@/main.css';

// 局外状态管理：登录、房间列表、加入/准备
// 简化：无断线重连；sessionId 存 localStorage；HTTP 直连 Bun/Hono 端口

type Phase = 'auth' | 'lobby' | 'play';
interface User { id: string; name: string }
interface RoomSummary { id: string; name: string; state: string; size: number; ready: number; capacity: number }

const host = import.meta.env.VITE_WS_HOST;
const port = import.meta.env.VITE_WS_PORT;
const httpBase = computed(() => `http://${host}:${port}`);
const wsUrl = computed(() => `ws://${host}:${port}`);

const sessionId = ref<string | null>(localStorage.getItem('sessionId'));
const user = ref<User | null>(null);
const phase = ref<Phase>('auth');
const rooms = ref<RoomSummary[]>([]);
const currentRoom = ref<RoomSummary | null>(null);
const statusText = ref('');
const loginName = ref('');
const loginPassword = ref('');
const newRoomName = ref('');
const roomCapacity = ref(4);
const logoutLabel = computed(() => user.value ? `退出(${user.value.name})` : '退出');

function setSession(id: string) {
    sessionId.value = id;
    localStorage.setItem('sessionId', id);
}
function clearSession() {
    sessionId.value = null;
    localStorage.removeItem('sessionId');
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionId.value) headers['x-session-id'] = sessionId.value;
    const res = await fetch(`${httpBase.value}${path}`, { ...init, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

async function restoreSession() {
    if (!sessionId.value) return;
    try {
        const me = await api<{ user: User | null; roomId: string | null }>('/api/me');
        if (!me.user) {
            clearSession();
            phase.value = 'auth';
            return;
        }
        user.value = me.user;
        phase.value = me.roomId ? 'play' : 'lobby';
        if (me.roomId) {
            const state = await api<{ room: RoomSummary }>(`/api/rooms/${me.roomId}/state`);
            currentRoom.value = state.room;
        }
        await fetchRooms();
    } catch (err) {
        console.error('restore session failed', err);
        clearSession();
        phase.value = 'auth';
    }
}

async function login() {
    if (!loginName.value.trim() || !loginPassword.value.trim()) {
        statusText.value = '请输入用户名和密码';
        return;
    }
    try {
        const res = await api<{ sessionId: string; user: User }>('/api/login', {
            method: 'POST',
            body: JSON.stringify({ name: loginName.value.trim(), password: loginPassword.value.trim() })
        });
        setSession(res.sessionId);
        user.value = res.user;
        phase.value = 'lobby';
        statusText.value = '登录成功';
        await fetchRooms();
    } catch (err) {
        statusText.value = '登录失败';
        console.error(err);
    }
}

async function fetchRooms() {
    try {
        const res = await api<{ rooms: RoomSummary[] }>('/api/rooms');
        rooms.value = res.rooms;
    } catch (err) {
        console.error('fetch rooms failed', err);
    }
}

async function createRoom() {
    if (!user.value) return;
    try {
        const res = await api<{ room: RoomSummary }>('/api/rooms', {
            method: 'POST',
            body: JSON.stringify({ name: newRoomName.value || undefined, capacity: roomCapacity.value })
        });
        // 创建后立即加入房间，确保服务端登记成员
        await joinRoom(res.room.id);
        statusText.value = `已创建房间 ${res.room.name}`;
    } catch (err) {
        statusText.value = '创建房间失败';
        console.error(err);
    }
}

async function joinRoom(roomId: string) {
    if (!user.value) return;
    try {
        const res = await api<{ ok: boolean; room: RoomSummary }>(`/api/rooms/${roomId}/join`, {
            method: 'POST'
        });
        if (res.ok) {
            currentRoom.value = res.room;
            phase.value = 'play';
            statusText.value = `已加入房间 ${res.room.name}`;
        }
    } catch (err) {
        statusText.value = '加入房间失败';
        console.error(err);
    }
}

function logout() {
    clearSession();
    user.value = null;
    currentRoom.value = null;
    rooms.value = [];
    phase.value = 'auth';
    statusText.value = '';
}

onMounted(() => {
    if (sessionId.value) restoreSession();
});

const currentView = computed(() => {
    if (phase.value === 'auth') return AuthView;
    if (phase.value === 'lobby') return LobbyView;
    if (phase.value === 'play') return Game;
    return AuthView;
});

const viewProps = computed(() => {
    if (phase.value === 'auth') {
        return {
            statusText: statusText.value,
            loginName: loginName.value,
            loginPassword: loginPassword.value,
            'onUpdate:loginName': (val: string) => (loginName.value = val),
            'onUpdate:loginPassword': (val: string) => (loginPassword.value = val),
            onLogin: login,
        };
    }
    if (phase.value === 'lobby') {
        return {
            rooms: rooms.value,
            newRoomName: newRoomName.value,
            roomCapacity: roomCapacity.value,
            'onUpdate:newRoomName': (val: string) => (newRoomName.value = val),
            'onUpdate:roomCapacity': (val: number) => (roomCapacity.value = val),
            onRefresh: fetchRooms,
            onJoin: (id: string) => joinRoom(id),
            onCreate: createRoom,
        };
    }
    return {
        wsUrl: wsUrl.value,
        sessionId: sessionId.value!,
        active: true,
        key: `${sessionId.value ?? ''}-${currentRoom.value?.id ?? ''}`,
    };
});
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <h1 class="title">Meeplit Demo</h1>
            <div class="room-center" v-if="currentRoom">房间：{{ currentRoom.name }}</div>
            <div class="spacer"></div>
            <button class="logout" @click="logout">{{ logoutLabel }}</button>
        </header>

        <component class="app-body" :is="currentView" v-bind="viewProps" />
    </div>
</template>

<style scoped>
.title {
    font-size: 20px;
    margin: 0;
}
.room-center {
    margin-left: auto;
    margin-right: auto;
    font-weight: 600;
}
.spacer { flex: 1; }
.logout {
    padding: 6px 10px;
}
</style>
