import '@/app/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidepanelView } from '../../features/sidepanel';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <SidepanelView />
    </React.StrictMode>,
  );
}
