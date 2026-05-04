import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/video': {
        target: 'http://192.168.0.101:5000',
        changeOrigin: true
      },
      '/user': {
        target: 'http://192.168.0.101:5000',
        changeOrigin: true
      },
      '/minor': {
        target: 'http://192.168.0.101:5000',
        changeOrigin: true
      }
    }
  }
})
