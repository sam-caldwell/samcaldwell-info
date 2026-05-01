import { createElement } from 'specifyjs';
import { createRoot } from '@asymmetric-effort/specifyjs/dom';
import { injectGlobalStyles } from './theme.js';
import { App } from './App.js';

// Inject global CSS
injectGlobalStyles();

// Mount the application
const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);

  let renderScheduled = false;
  function scheduleRerender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      root.render((createElement as any)(App, null));
    });
  }

  // Expose re-render function for the hook bridge's useState
  (globalThis as any).__specifyjs_rerender = scheduleRerender;

  // Initial render
  root.render((createElement as any)(App, null));
}
