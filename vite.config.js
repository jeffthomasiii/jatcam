import { defineConfig } from 'vite';

export default defineConfig({
  base: '/jatcam/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
