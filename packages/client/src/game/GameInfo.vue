<script setup lang="ts">

interface Props {
  text?: string
}

const {text: msg = 'hello'} = defineProps<Props>()

</script>

<template>
    {{ text }}
</template>