import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
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
    version: '0.0.5',
    permissions: ['sidePanel', 'storage', 'tabs', 'activeTab'],
    host_permissions: [
      '*://localhost/*',
      '*://footics.com/*',
      '<all_urls>',
      '*://*.unext.jp/*',
      '*://video.unext.jp/*',
      '*://abema.tv/*',
    ],
    commands: {
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
    },
    side_panel: {
      default_path: 'entrypoints/sidepanel/index.html',
    },
  },
});