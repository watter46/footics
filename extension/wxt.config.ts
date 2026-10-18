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
      sourcemap: 'inline',
      minify: false,
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
  manifest: (env) => {
    const isDev = env.command === 'serve';

    return {
      name: isDev ? '[DEV] Footics Tactical' : 'Footics Tactical',
      version: '1.0.0',
      description:
        'Premier League tactical analysis, video frame capture, and interactive tactical board.',
      icons: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
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
      action: {
        default_title: 'Footics Dashboardを開く',
      },
      side_panel: {
        default_path: 'entrypoints/sidepanel/index.html',
      },
    };
  },
});
