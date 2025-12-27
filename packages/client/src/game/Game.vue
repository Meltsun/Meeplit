<script setup lang="ts">
import Layout from './Layout.vue';
import GameInfo from '@/game/gameInfo/GameInfo.vue'

</script>

<template>
    <Layout>
        <template #gameInfo>
            <GameInfo />
        </template>
    </Layout>
</template>
