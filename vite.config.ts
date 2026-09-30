/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  // Vercel отдаёт приложение с корня домена — префикс пути не нужен.
  base: '/',
  plugins: [react(), tailwindcss()],
  // Версия сборки попадает в каждую запись журнала: по ней ошибку из
  // браузера участницы сверяют с конкретным коммитом.
  define: {
    __APP_VERSION__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}))
