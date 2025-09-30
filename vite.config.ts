import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true
  },
  preview: {
    allowedHosts: true
  },
  build: {
    sourcemap: true // optional for dev, required for prod debugging
  },
})
