import '@/app/globals.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SidepanelView } from '~/features/sidepanel';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <SidepanelView />
    </React.StrictMode>,
  );
}
