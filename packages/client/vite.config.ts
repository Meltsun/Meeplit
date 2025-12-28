import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  envDir: resolve(__dirname, '../..'),
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    tailwindcss(),
  ],
  root: __dirname,
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  // 禁止对库进行依赖预打包，这样断点能命中源码而非 .vite/deps 产物
  build: {
    sourcemap: true,
  },
  esbuild: {
    sourcemap: true
  },
})