/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new version waits until the user taps Refresh in <UpdateBanner />, instead of
      // silently activating so they only see it on the NEXT launch. Registration happens in the
      // banner via virtual:pwa-register/react, so no separate registerSW.js is injected.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'BehaviorLens Demo',
        short_name: 'BehaviorLens Demo',
        description: 'Classroom behavior data collection (demo, data stays on this device)',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['./src/test/setup.ts'] },
});
