import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const apiPort = Number(process.env.API_PORT || '3001');

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: `http://localhost:${apiPort}`,
                changeOrigin: true,
            },
            '/ws': {
                target: `ws://localhost:${apiPort}`,
                ws: true,
            },
        },
    },
});