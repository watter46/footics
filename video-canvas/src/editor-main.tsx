import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorApp from './EditorApp';
import '../assets/editor.css';

if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <EditorApp />
      </React.StrictMode>,
    );
  }
}

