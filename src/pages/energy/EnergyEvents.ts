import { useState, useEffect } from 'specifyjs';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { sentimentColor } from '../../utils/colors.js';
import type { EnergyEvent } from '../../types.js';

export function EnergyEvents() {
  useSeoHead(
    'Energy Events & Sentiment',
    'Historical and recent energy-market shocks with editorial sentiment scores, from 1999 to present.',
  );

  const [events, setEvents] = useState<EnergyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCsv<EnergyEvent>('/data/energy/events_energy.csv').then(e => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const haveEvents = events.length > 0;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Recent events (past 24 months)
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recentEvents = events
    .filter(e => e.date >= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  // All events sorted by date descending
  const allEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));

  // Sentiment renderer
  const sentimentRender = (v: unknown) => {
    const n = v as number;
    if (n == null || isNaN(n)) return '\u2014';
    const color = sentimentColor(n);
    const sign = n > 0 ? '+' : '';
    return h('span', { style: { color, fontWeight: '600' } }, `${sign}${n.toFixed(2)}`);
  };

  const eventColumns = [
    { key: 'date', header: 'Date', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'event', header: 'Event', sortable: true },
    { key: 'sentiment', header: 'Sentiment', sortable: true, render: sentimentRender },
    { key: 'notes', header: 'Notes', sortable: false },
  ];

  return h('div', null,
    h('h1', null, 'Energy Events & Sentiment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Historical and recent energy-market shocks with sentiment scores',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Sentiment values are editorial.'),
        ' Each score in events_energy.csv is a \u22121..+1 reading of contemporaneous market reaction plus near-term policy/industry impact. These are a single-author aggregation \u2014 the CSV\'s notes column explains the anchor for each row. Future enhancement: derive sentiment from GDELT tone around the event date.',
      ),
    ),

    // Recent events
    h('h2', { id: 'recent' }, 'Recent Events (Past 24 Months)'),
    haveEvents && recentEvents.length > 0
      ? h(VizWrapper, { title: `${recentEvents.length} events in the past 24 months` },
          h(DataGrid, {
            columns: eventColumns,
            data: recentEvents,
            pageSize: 15,
            striped: true,
            compact: true,
          }),
        )
      : h('p', { style: proseStyle }, 'No events in the past 24 months.'),

    // Full historical events
    h('h2', { id: 'historical' }, 'Full Historical Events'),
    haveEvents
      ? h(VizWrapper, { title: `${allEvents.length} total energy events` },
          h(DataGrid, {
            columns: eventColumns,
            data: allEvents,
            pageSize: 15,
            striped: true,
            compact: true,
          }),
        )
      : h(Callout, { type: 'warning' }, 'Energy event data is not yet available.'),
  );
}
