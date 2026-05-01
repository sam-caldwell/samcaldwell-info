import { h } from '../h.js';
import { toneColor } from '../utils/formatters.js';

export interface ValueCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'positive' | 'negative' | 'neutral' | 'warn';
}

export function ValueCard(props: ValueCardProps) {
  const { label, value, sublabel, tone = 'neutral' } = props;
  const borderColor = toneColor(tone);

  return h('div', {
    style: {
      display: 'inline-block',
      padding: '14px 20px',
      background: '#fff',
      border: '1px solid #dee2e6',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '6px',
      minWidth: '160px',
    },
  },
    h('div', { style: { fontSize: '0.82rem', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' } }, label),
    h('div', { style: { fontSize: '1.5rem', fontWeight: '700', color: '#1d3557', lineHeight: '1.2' } }, value),
    sublabel ? h('div', { style: { fontSize: '0.82rem', color: '#6c757d', marginTop: '4px' } }, sublabel) : null,
  );
}
