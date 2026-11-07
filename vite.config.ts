import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para que el build cargue correctamente desde file:// dentro de Electron
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
