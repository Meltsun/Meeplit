<script setup lang="ts">
import MarkdownIt from 'markdown-it';
import { computed } from 'vue';
import { useGameState } from '@/game/GameService';

const gameState = useGameState();
const markdown = new MarkdownIt({ linkify: true, breaks: true });
const renderedMarkdown = computed(() => markdown.render(gameState.gameInfo.value || ''));

</script>

<template>
  <div class="prose prose-sm max-w-none w-full" v-html="renderedMarkdown" />
</template>

<style scoped>
.prose :is(h1, h2, h3, p, ul, ol) {
  margin: 0 0 0.35rem;
}

.prose :is(h1, h2, h3) {
  line-height: 1.25;
}

.prose > :first-child {
  margin-top: 0;
}

.prose > :last-child {
  margin-bottom: 0;
}
</style>