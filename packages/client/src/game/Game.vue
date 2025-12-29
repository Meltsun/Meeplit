<script setup lang="ts">
import Layout from './Layout.vue';
import GameInfo from '@/game/gameInfo/GameInfo.vue'
import InputTest2Modal from '@/game/inputTest2/InputTestModal.vue'

</script>

<template>
    <Layout>
        <template #gameInfo>
            <GameInfo />
            <InputTest2Modal />
        </template>
    </Layout>
</template>
