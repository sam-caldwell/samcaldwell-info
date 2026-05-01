import { createElement } from 'specifyjs';
import { createRoot } from '@asymmetric-effort/specifyjs/dom';
import { injectGlobalStyles } from './theme.js';
import { setRerenderCallback } from './utils/data-cache.js';
import { App } from './App.js';

// Inject global CSS
injectGlobalStyles();

// Mount the application
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);

  let renderPending = false;
  function doRender() {
    root.render((createElement as any)(App, null));
  }

  // Data cache calls this when CSV data arrives
  setRerenderCallback(() => {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      doRender();
    });
  });

  // Initial render
  doRender();
}
