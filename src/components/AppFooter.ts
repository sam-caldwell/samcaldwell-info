import { Footer } from '@asymmetric-effort/specifyjs/components';
import { h } from '../h.js';
import { APP_VERSION, formatBuildTimestamp } from '../version.js';

export function AppFooter() {
  return h(Footer, {
    left: h('span', null, `v${APP_VERSION}`),
    center: h('span', null,
      '\u00A9 2026 Sam Caldwell. Sonora, Texas. ',
      h('a', {
        href: 'https://samcaldwell.net/',
        target: '_blank',
        rel: 'noopener noreferrer',
      }, 'https://samcaldwell.net/')
    ),
    right: h('span', null, `Updated: ${formatBuildTimestamp()}`),
    borderTop: '1px solid #dee2e6',
    background: '#ffffff',
    color: '#6c757d',
    fontSize: '0.85rem',
    padding: '12px 24px',
    className: 'app-footer',
  });
}
