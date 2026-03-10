import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    strictPort: true, // Para que falle si el puerto 5000 está ocupado en lugar de usar otro
    proxy: {
      '/api': {
        target: 'http://localhost:4000/',
        changeOrigin: true,
      },
    },
  }
})
