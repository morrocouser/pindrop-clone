import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port 5173 : c'est l'origine autorisée par CORS_ORIGIN côté backend
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }
});
