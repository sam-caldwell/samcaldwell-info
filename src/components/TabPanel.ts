import { h } from '../h.js';

export interface TabDef {
  label: string;
  content: () => any;
}

export interface TabPanelProps {
  tabs: TabDef[];
}

/**
 * Tab panel using DOM-based state instead of useState.
 * SpecifyJS's reconciler re-mounts on every render, so useState-based
 * tab selection doesn't persist. This implementation renders all tabs
 * and uses CSS display to show/hide, with DOM click handlers.
 */
export function TabPanel(props: TabPanelProps) {
  const { tabs } = props;
  if (tabs.length === 0) return null;

  // Unique ID for this tab panel instance
  const id = 'tp-' + Math.random().toString(36).slice(2, 8);

  // Render all tab contents, hide all but the first
  const tabHeaders = tabs.map((tab, i) =>
    h('button', {
      key: String(i),
      'data-tab-index': String(i),
      'data-tab-group': id,
      className: `tab-btn ${i === 0 ? 'tab-btn-active' : ''}`,
      onClick: (e: any) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-tab-index'));
        const group = e.currentTarget.getAttribute('data-tab-group');
        // Hide all panels, show selected
        document.querySelectorAll(`[data-panel-group="${group}"]`).forEach((el: any) => {
          el.style.display = 'none';
        });
        const target = document.querySelector(`[data-panel-group="${group}"][data-panel-index="${idx}"]`) as HTMLElement;
        if (target) target.style.display = 'block';
        // Update button styles
        document.querySelectorAll(`[data-tab-group="${group}"]`).forEach((btn: any) => {
          btn.className = 'tab-btn';
        });
        e.currentTarget.className = 'tab-btn tab-btn-active';
      },
      style: {
        padding: '10px 20px',
        border: 'none',
        borderBottom: i === 0 ? '2px solid #2a6f97' : '2px solid transparent',
        background: 'transparent',
        color: i === 0 ? '#2a6f97' : '#6c757d',
        fontWeight: i === 0 ? '600' : '400',
        fontSize: '0.95rem',
        cursor: 'pointer',
        marginBottom: '-2px',
      },
    }, tab.label)
  );

  const tabPanels = tabs.map((tab, i) =>
    h('div', {
      key: `panel-${i}`,
      'data-panel-group': id,
      'data-panel-index': String(i),
      style: { display: i === 0 ? 'block' : 'none' },
    }, tab.content())
  );

  // Inject tab button styles once
  if (typeof document !== 'undefined' && !document.getElementById('tab-panel-styles')) {
    const style = document.createElement('style');
    style.id = 'tab-panel-styles';
    style.textContent = `
      .tab-btn { transition: color 0.15s, border-color 0.15s; }
      .tab-btn:hover { color: #2a6f97; }
      .tab-btn-active { color: #2a6f97 !important; font-weight: 600 !important; border-bottom: 2px solid #2a6f97 !important; }
    `;
    document.head.appendChild(style);
  }

  return h('div', { style: { margin: '20px 0' } },
    h('div', {
      style: {
        display: 'flex',
        gap: '0',
        borderBottom: '2px solid #dee2e6',
        marginBottom: '16px',
      },
    }, ...tabHeaders),
    ...tabPanels,
  );
}
