// SCOUT3D v1.0 · © SCOUT SYSTEM
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handlePin } from './api/_pin.js';

/**
 * 本機 dev／preview 都有 /api/export-pin（同 Vercel function 同一段 code）。
 * 讀 process.env 同 .env.local 嘅 EXPORT_PIN；只攞 EXPORT_ 前綴，唔會打包入前端。
 */
function exportPinApi(mode) {
  const env = { ...loadEnv(mode, process.cwd(), 'EXPORT_'), ...process.env };
  const mw = (req, res, next) => (req.url?.split('?')[0] === '/api/export-pin' ? handlePin(req, res, env) : next());
  return {
    name: 'scout3d-export-pin',
    configureServer: (server) => void server.middlewares.use(mw),
    configurePreviewServer: (server) => void server.middlewares.use(mw),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), exportPinApi(mode)],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
}));
