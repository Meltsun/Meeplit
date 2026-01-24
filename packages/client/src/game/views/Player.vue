<script setup lang="ts">
import { ref, watch } from 'vue';
import {CardList} from '@/game/components';
import {resolveAssetUrl} from "@/game/utils";
import { useGameState } from '@/game/GameService';

const gameState = useGameState();
const cards = gameState.handCards;
const maxSelection = gameState.maxSelection;
const seatNumber = gameState.seatNumber;

const hoveredCardId = ref<string | null>(null);
const selectedIndices = ref<number[]>([]);

// Ability 展示数据（组件内状态，可通过 expose 方法修改）
const defaultAbilityImg = '/assets/未知卡牌.png';
const abilityImageUrl = ref<string>(resolveAssetUrl(defaultAbilityImg).toString());
const abilityPlayerName = ref<string>('');

watch(() => maxSelection.value, () => {
    selectedIndices.value = [];
});

watch(
    () => cards.value,
    () => {
        selectedIndices.value = selectedIndices.value.filter((index) => isSelectableIndex(index));
    },
    { deep: true }
);

const isSelectableIndex = (index: number) => {
    const card = cards.value[index];
    return !!card;
};

const toggleSelection = (index: number) => {
    if (!isSelectableIndex(index)) return;
    const i = selectedIndices.value.indexOf(index);
    if (i > -1) {
        selectedIndices.value.splice(i, 1);
    } else {
        if (maxSelection.value && selectedIndices.value.length >= maxSelection.value) {
            selectedIndices.value.shift();
        }
        selectedIndices.value.push(index);
    }
};

defineExpose({
    getSelectedCards: function () {
        return selectedIndices.value.map((i) => cards.value[i]).filter(Boolean);
    },
    getHoveredCardId: function () {
        return hoveredCardId.value;
    },
    setAbilityInfo: function (imageUrl?: string, playerName?: string) {
        abilityImageUrl.value = resolveAssetUrl(imageUrl || defaultAbilityImg).toString();
        abilityPlayerName.value = playerName || '';
    },
});
</script>

<template>
    <div class="relative w-full h-full bg-[#e6f7ff] flex self-stretch">
        <!-- ability 区域（左侧），图片高度撑满 Player，比例保持原图（始终展示） -->
        <div class="relative h-full flex-none shrink-0 select-none">
            <img :src="abilityImageUrl" alt="ability" class="block h-full w-auto" draggable="false" />
            <!-- 左上角叠加：座位号 + 玩家名（移除灰色背景与模糊） -->
            <div class="absolute top-2 left-2 flex items-center gap-2 text-white text-sm font-semibold pointer-events-none">
                <span class="inline-flex items-center justify-center bg-[#0f1d3a] text-white rounded-sm px-1.5 py-0.5 leading-none min-w-[20px] text-xs drop-shadow-sm">
                    {{ seatNumber }}
                </span>
                <span class="truncate max-w-[160px] drop-shadow-sm">
                    {{ abilityPlayerName }}
                </span>
            </div>
        </div>

        <!-- 右侧卡牌列表区域，占据剩余空间 -->
        <div class="flex-1 h-full">
            <CardList
                :cards="cards"
                :selected-indices="selectedIndices"
                :selectable-card-ids="undefined"
                @toggle="toggleSelection"
                @hover="hoveredCardId = $event"
                @unhover="hoveredCardId = null"
            >
            </CardList>
        </div>

        <!-- 数量提示 -->
        <div v-if="cards.length" class="absolute top-1 right-2 bg-black/20 text-[#0f1d3a] text-xs font-bold px-2 py-1 rounded-full pointer-events-none backdrop-blur-[2px]">
            {{ cards.length }}
        </div>
    </div>
</template>