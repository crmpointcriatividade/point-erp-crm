import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    hmr: true,
  },
  build: {
    // XLSX é carregado via CDN no index.html (window.XLSX),
    // por isso marcamos como external para o Rollup não tentar empacotá-lo
    rollupOptions: {
      external: ['xlsx'],
      output: {
        globals: {
          xlsx: 'XLSX',
        },
      },
    },
  },
});
