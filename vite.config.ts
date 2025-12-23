import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Changed from 'terser' to 'esbuild' to fix missing dependency error
  },
  server: {
    historyApiFallback: true,
  }
});