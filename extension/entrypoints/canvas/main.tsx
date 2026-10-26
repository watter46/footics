import '@/app/globals.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QuickTacticalCanvas } from '~/features/canvas/components/QuickTacticalCanvas';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <QuickTacticalCanvas />
    </React.StrictMode>,
  );
}
