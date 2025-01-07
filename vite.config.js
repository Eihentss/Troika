import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',  // Vai tieši varat ievadīt IP adresi
        port: 5173,        // Pārliecinieties, ka ports ir atbilstošs
        hmr: {
          host: '10.13.57.76',  // Ja nepieciešams, iestatiet HMR host
        }
      }
});
