import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    esbuild: {
      charset: 'ascii',
    },
    build: {
      minify: 'terser',
      terserOptions: {
        format: {
          ascii_only: true,
        },
      },
    },
    resolve: {
      alias: {
        '@/': `${resolve(__dirname, '../src')}/`,
      },
    },
    server: {
      watch: {
        usePolling: true, // WSLでの変更検知を確実にする
      },
    },
  }),
  manifest: {
    name: 'Footics Sidepanel',
    version: '0.0.0',
    permissions: [
      'sidePanel',
      'storage',
      'tabs',
      'activeTab',
      'clipboardWrite',
      'unlimitedStorage',
    ],
    host_permissions: ['<all_urls>'],
    commands: {
      'capture-to-tactical': {
        suggested_key: {
          default: 'Alt+S',
        },
        description: 'Capture video frame and send to Footics Tactical',
      },
      'toggle-match-memo': {
        suggested_key: {
          default: 'Alt+W',
        },
        description: 'Toggle Match Memo Overlay',
      },
      'toggle-event-memo': {
        suggested_key: {
          default: 'Alt+E',
        },
        description: 'Toggle Event Memo Overlay',
      },
      'toggle-mini-mode': {
        suggested_key: {
          default: 'Alt+M',
        },
        description: 'Toggle Memo Overlay Mini/Full Mode',
      },
    },
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html',
    },
  },
});
