import '@/app/globals.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QuickCanvasView } from '../../features/canvas/components/QuickCanvasView';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <QuickCanvasView />
    </React.StrictMode>,
  );
}
