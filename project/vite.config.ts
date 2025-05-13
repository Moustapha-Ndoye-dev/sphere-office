import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Increase timeout to avoid the _onTimeout error
    hmr: {
      timeout: 5000
    }
  }
})