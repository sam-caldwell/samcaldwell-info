import { useState } from 'specifyjs';
import { h } from '../h.js';

export interface TabDef {
  label: string;
  content: () => any;
}

export interface TabPanelProps {
  tabs: TabDef[];
}

export function TabPanel(props: TabPanelProps) {
  const [active, setActive] = useState(0);
  const { tabs } = props;

  return h('div', { style: { margin: '20px 0' } },
    // Tab headers
    h('div', {
      style: {
        display: 'flex',
        gap: '0',
        borderBottom: '2px solid #dee2e6',
        marginBottom: '16px',
      },
    },
      ...tabs.map((tab, i) =>
        h('button', {
          key: String(i),
          onClick: () => setActive(i),
          style: {
            padding: '10px 20px',
            border: 'none',
            borderBottom: i === active ? '2px solid #2a6f97' : '2px solid transparent',
            background: 'transparent',
            color: i === active ? '#2a6f97' : '#6c757d',
            fontWeight: i === active ? '600' : '400',
            fontSize: '0.95rem',
            cursor: 'pointer',
            marginBottom: '-2px',
          },
        }, tab.label)
      ),
    ),
    // Active tab content
    tabs[active] ? tabs[active].content() : null,
  );
}
