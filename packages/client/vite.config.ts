import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  envDir: resolve(__dirname, '../..'),
  plugins: [
    vueDevTools(),
    vue(),
  ],
  root: './packages/client',
  server: {
    port: 5173
  }
})