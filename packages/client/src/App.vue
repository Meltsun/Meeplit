<template>
  <div>
    <h1>Meeplit Client</h1>
    <p>WS_URL (build-time): {{ wsPort }}</p>
    <div id="stage"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {startReverseRPCServer} from './reverse-rpc-server';

startReverseRPCServer("ws://localhost:" + import.meta.env.VITE_WS_PORT,{
  log : (msg: string) => {
    console.log("[Reverse RPC]", msg);
    return "ok"
  }
});



export default defineComponent({
  name: 'App',
  data() {
    return {
      wsPort: import.meta.env.VITE_WS_PORT
    }
  }
})
</script>