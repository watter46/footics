import '@/app/globals.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardView } from '~/features/dashboard/components/DashboardView';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <DashboardView />
    </React.StrictMode>,
  );
}
