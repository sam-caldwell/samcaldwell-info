import { createElement } from 'specifyjs';
import { createRoot } from '@asymmetric-effort/specifyjs/dom';
import { injectGlobalStyles, initDarkMode } from './theme.js';
import { setRerenderCallback } from './utils/data-cache.js';
import { App } from './App.js';

// Inject global CSS and initialize dark mode from system preference
injectGlobalStyles();
initDarkMode();

// Accessibility: SpecifyJS DataGrid creates <input> elements without id/name.
// This observer patches them to satisfy WCAG and prevent console warnings.
let inputCounter = 0;

/**
 * Fix SVG legend overlap: SpecifyJS LineGraph places legend <text> elements
 * at fixed x intervals that can overlap when labels are long. This function
 * detects overlapping legend texts and wraps them to new rows.
 */
function fixSvgLegendSpacing(svg: SVGSVGElement) {
  // Legend texts are at the top of the SVG, typically y < 40, font-size 12
  const texts = Array.from(svg.querySelectorAll('text')).filter(t => {
    const y = parseFloat(t.getAttribute('y') || '0');
    const fontSize = parseFloat(t.getAttribute('font-size') || '0');
    return y < 45 && fontSize <= 12 && (t.textContent || '').length > 1;
  });
  if (texts.length < 2) return;

  // Measure actual text widths using getBBox
  const items: { el: SVGTextElement; x: number; width: number; text: string }[] = [];
  for (const t of texts) {
    try {
      const bbox = (t as SVGTextElement).getBBox();
      items.push({ el: t as SVGTextElement, x: bbox.x, width: bbox.width, text: t.textContent || '' });
    } catch { /* getBBox can fail if not rendered */ }
  }
  if (items.length < 2) return;
  items.sort((a, b) => a.x - b.x);

  // Check for overlaps and reposition with adequate spacing
  const minGap = 16;
  let currentX = items[0].x;
  const baseY = parseFloat(items[0].el.getAttribute('y') || '32');
  let row = 0;
  const svgWidth = parseFloat(svg.getAttribute('viewBox')?.split(' ')[2] || '600');

  for (let i = 0; i < items.length; i++) {
    if (i === 0) {
      currentX = items[i].x + items[i].width + minGap;
      continue;
    }

    const neededX = currentX;
    if (neededX + items[i].width > svgWidth - 20) {
      // Wrap to next row
      row++;
      currentX = items[0].x;
    }

    items[i].el.setAttribute('x', String(Math.max(currentX, items[i].x)));
    if (row > 0) {
      items[i].el.setAttribute('y', String(baseY + row * 16));
    }
    currentX = Math.max(currentX, items[i].x) + items[i].width + minGap;
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        // Patch form inputs without id/name
        const inputs = node.querySelectorAll
          ? node.querySelectorAll('input:not([id]):not([name]), select:not([id]):not([name])')
          : [];
        inputs.forEach((el) => {
          const id = `sjs-field-${++inputCounter}`;
          el.setAttribute('id', id);
          el.setAttribute('name', id);
        });
        if (node.matches?.('input:not([id]):not([name]), select:not([id]):not([name])')) {
          const id = `sjs-field-${++inputCounter}`;
          node.setAttribute('id', id);
          node.setAttribute('name', id);
        }

        // Fix SVG legend spacing
        const svgs = node.querySelectorAll ? node.querySelectorAll('svg') : [];
        svgs.forEach((svg) => {
          requestAnimationFrame(() => fixSvgLegendSpacing(svg as SVGSVGElement));
        });
        if (node instanceof SVGSVGElement) {
          requestAnimationFrame(() => fixSvgLegendSpacing(node));
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
