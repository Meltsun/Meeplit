import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  envDir: resolve(__dirname, '../..'),
  plugins: [
    vue(),
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
    port: Number(process.env.VITE_CLIENT_ORIGIN_PORT),
  },
  build: {
    sourcemap: true,
  },
  esbuild: {
    sourcemap: true
  },
})