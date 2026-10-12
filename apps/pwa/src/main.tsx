import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { registerPwaServiceWorker } from './registerSW.js';
import { initTheme } from './utils/theme.js';
import './index.css';

initTheme();
registerPwaServiceWorker();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
