import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    // Genera archivos comprimidos para que el servidor los sirva directamente
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
  ],
  build: {
    // Mejora el reporte de Lighthouse reduciendo el tamaño de CSS y JS
    target: 'esnext',
    sourcemap: true,
    minify: false, 
    terserOptions: {
      compress: {
        drop_console: true, // Limpia la consola para ahorrar bytes en prod
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Optimización de Chunks: Menos archivos pero mejor distribuidos
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separar las librerías de animación ayuda a que no bloqueen el inicio
            if (id.includes('gsap') || id.includes('motion')) {
              return 'animations';
            }
            // Si es una librería de node_modules, métela toda en un solo saco llamado 'vendor'
            // Esto evita que Vite intente separar cosas que dependen entre sí
            return 'vendor';
          }
        },
        // Nombres de archivos limpios para mejor cacheo
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})