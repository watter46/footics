import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  }),
  manifest: {
    name: 'Video Canvas',
    version: '0.1.0',
    description: 'Capture video frames and edit them with SVG assets.',
    permissions: ['storage', 'tabs', 'activeTab', 'clipboardWrite', 'unlimitedStorage'],
    host_permissions: ['<all_urls>'],
    commands: {
      'capture-video-canvas': {
        suggested_key: {
          default: 'Alt+S',
        },
        description: 'Capture video frame and open editor',
      },
    },
  },
});
