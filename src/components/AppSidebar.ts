import { useState, useRouter } from 'specifyjs';
import { Sidebar } from '@asymmetric-effort/specifyjs/components';
import { h } from '../h.js';

const sidebarItems = [
  { id: '/', label: 'Home', icon: '\u2302' },
  {
    id: '/economy', label: 'US Economy', icon: '\u{1F4C8}',
    children: [
      { id: '/economy', label: 'Overview' },
      { id: '/economy/growth', label: 'Economic Growth' },
      { id: '/economy/indicators', label: 'Indicators' },
      { id: '/economy/unemployment', label: 'Unemployment Deep-Dive' },
      { id: '/economy/markets', label: 'Economy vs Markets' },
      { id: '/economy/about', label: 'Data & Citations' },
    ],
  },
  {
    id: '/presidential', label: 'Presidential Economies', icon: '\u{1F3DB}',
    children: [
      { id: '/presidential', label: 'Overview' },
      { id: '/presidential/growth', label: 'Growth by Admin' },
      { id: '/presidential/markets', label: 'Markets by Admin' },
      { id: '/presidential/fiscal', label: 'Fiscal by Admin' },
      { id: '/presidential/about', label: 'Methodology' },
    ],
  },
  {
    id: '/sentiment', label: 'Public Sentiment', icon: '\u{1F4CA}',
    children: [
      { id: '/sentiment', label: 'Overview' },
      { id: '/sentiment/approval', label: 'Political Approval' },
      { id: '/sentiment/economic', label: 'Economic Sentiment' },
      { id: '/sentiment/media', label: 'Media Sentiment' },
      { id: '/sentiment/society', label: 'Society Radar' },
      { id: '/sentiment/network', label: 'Network Graph' },
      { id: '/sentiment/about', label: 'Methodology' },
    ],
  },
  {
    id: '/cybersecurity', label: 'Cybersecurity', icon: '\u{1F6E1}',
    children: [
      { id: '/cybersecurity', label: 'Overview' },
      { id: '/cybersecurity/threats', label: 'Threat Sources' },
      { id: '/cybersecurity/botnets', label: 'Botnet Hosts' },
      { id: '/cybersecurity/cves', label: 'CVEs in the Wild' },
      { id: '/cybersecurity/about', label: 'Methodology' },
    ],
  },
  {
    id: '/energy', label: 'Energy', icon: '\u26A1',
    children: [
      { id: '/energy', label: 'Overview' },
      { id: '/energy/us-markets', label: 'US Markets' },
      { id: '/energy/intl-markets', label: 'International Markets' },
      { id: '/energy/supply-demand', label: 'Supply & Demand' },
      { id: '/energy/events', label: 'Events & Sentiment' },
      { id: '/energy/forecasts', label: 'Forecasts' },
      { id: '/energy/prices-map', label: 'Current Fuel Prices Map' },
      { id: '/energy/change-map', label: '10-Year Price Change Map' },
      { id: '/energy/about', label: 'Methodology' },
    ],
  },
  {
    id: '/west-texas', label: 'West Texas', icon: '\u2606',
    children: [
      { id: '/west-texas', label: 'Overview' },
      { id: '/west-texas/unemployment', label: 'Unemployment' },
      { id: '/west-texas/income', label: 'Per-Capita Income' },
      { id: '/west-texas/gdp', label: 'Economic Output' },
      { id: '/west-texas/about', label: 'Methodology' },
    ],
  },
  {
    id: '/fcc', label: 'FCC Applications', icon: '\u{1F4E1}',
    children: [
      { id: '/fcc', label: 'Overview' },
      { id: '/fcc/by-type', label: 'By Type' },
      { id: '/fcc/by-year', label: 'By Year' },
      { id: '/fcc/ham-decisions', label: 'HAM Decisions' },
      { id: '/fcc/gmrs-decisions', label: 'GMRS Decisions' },
      { id: '/fcc/gmrs-felony', label: 'GMRS Felony Analysis' },
      { id: '/fcc/about', label: 'Methodology' },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname, navigate } = useRouter();

  return h(Sidebar, {
    items: sidebarItems,
    collapsed,
    onToggleCollapse: () => setCollapsed(!collapsed),
    selectedId: pathname || '/',
    onSelect: (id: string) => navigate(id),
    width: 260,
    collapsedWidth: 56,
  });
}
