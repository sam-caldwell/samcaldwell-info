import { h } from '../h.js';

export interface CardRowProps {
  children?: any;
}

export function CardRow(props: CardRowProps) {
  return h('div', {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      margin: '20px 0',
    },
  }, props.children);
}
