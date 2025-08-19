import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/quantum-tutor/",   // 👈 this must match your repo name
})
