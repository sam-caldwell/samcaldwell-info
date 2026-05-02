import { createElement } from 'specifyjs';
import { createRoot } from '@asymmetric-effort/specifyjs/dom';
import { injectGlobalStyles } from './theme.js';
import { setRerenderCallback } from './utils/data-cache.js';
import { App } from './App.js';

// Inject global CSS
injectGlobalStyles();

// Accessibility: SpecifyJS DataGrid creates <input> elements without id/name.
// This observer patches them to satisfy WCAG and prevent console warnings.
let inputCounter = 0;
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        const inputs = node.querySelectorAll
          ? node.querySelectorAll('input:not([id]):not([name]), select:not([id]):not([name])')
          : [];
        inputs.forEach((el) => {
          const id = `sjs-field-${++inputCounter}`;
          el.setAttribute('id', id);
          el.setAttribute('name', id);
        });
        // Also patch the node itself if it's an input
        if (node.matches?.('input:not([id]):not([name]), select:not([id]):not([name])')) {
          const id = `sjs-field-${++inputCounter}`;
          node.setAttribute('id', id);
          node.setAttribute('name', id);
        }
      }
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

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
