<script setup lang="ts">
import {useChatStore} from '@/game/gameInfo/GameInfoService'

</script>

<template>
    {{ useChatStore().gameInfoText }}
</template>