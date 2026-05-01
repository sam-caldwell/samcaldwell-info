import { h } from '../h.js';

export interface CalloutProps {
  type?: 'note' | 'warning' | 'important';
  title?: string;
  children?: any;
}

const borderColors = {
  note: '#2a6f97',
  warning: '#f2c14e',
  important: '#bc4749',
};

const bgColors = {
  note: '#f0f7ff',
  warning: '#fffbeb',
  important: '#fef2f2',
};

export function Callout(props: CalloutProps) {
  const { type = 'note', title, children } = props;

  return h('div', {
    style: {
      padding: '14px 18px',
      borderLeft: `4px solid ${borderColors[type]}`,
      background: bgColors[type],
      borderRadius: '4px',
      margin: '16px 0',
    },
  },
    title ? h('strong', { style: { display: 'block', marginBottom: '4px', color: '#1d3557' } }, title) : null,
    h('div', { style: { fontSize: '0.95rem', color: '#495057', lineHeight: '1.5' } }, children),
  );
}
