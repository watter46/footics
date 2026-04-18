import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.png',
    developmentIndicator: 'overlay', // 開発環境ではDEVオーバーレイを表示
  },
  vite: () => ({
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  }),
  manifest: (env) => ({
    name: env.mode === 'development' ? 'Video Canvas [DEV]' : 'Video Canvas',
    version: '0.1.0',
    description: 'Capture video frames and edit them with SVG assets.',
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'clipboardWrite',
      'unlimitedStorage',
    ],
    host_permissions: ['<all_urls>'],
    commands: {
      'capture-video-canvas': {
        suggested_key: {
          default: 'Alt+S',
        },
        description: 'Capture video frame and open editor',
      },
    },
  }),
});
