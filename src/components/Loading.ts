import { Spinner } from '@asymmetric-effort/specifyjs/components';
import { h } from '../h.js';

/** Loading spinner shown while data is being fetched */
export function Loading() {
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 0',
      color: '#6c757d',
      gap: '12px',
    },
  },
    h(Spinner, { size: 'md', color: '#2a6f97' }),
    h('span', null, 'Loading data\u2026'),
  );
}
