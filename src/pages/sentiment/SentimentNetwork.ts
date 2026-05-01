import { useState, useEffect } from 'specifyjs';
import { h } from '../../h.js';
import { getJson } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { sentimentColor } from '../../utils/colors.js';
import type { NetworkGraph, NetworkNode, NetworkLink } from '../../types.js';

interface SimNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  role: string;
  weight?: number;
}

const shortPresident: Record<string, string> = {
  'Bill Clinton': 'Clinton',
  'George W. Bush': 'Bush (43)',
  'Barack Obama': 'Obama',
  'Donald Trump (1st term)': 'Trump I',
  'Joe Biden': 'Biden',
  'Donald Trump (2nd term)': 'Trump II',
};

function nodeFill(d: SimNode): string {
  if (d.type === 'president') return '#6c757d';
  if (d.sentiment == null || isNaN(d.sentiment)) return '#adb5bd';
  return sentimentColor(d.sentiment);
}

function linkColor(role: string): string {
  if (role === 'opposed') return '#bc4749';
  if (role === 'supported') return '#2f9e44';
  return '#adb5bd';
}

function linkDash(role: string): string {
  if (role === 'opposed') return '4,3';
  if (role === 'supported') return '2,2';
  return '';
}

function linkWidth(role: string): number {
  if (role === 'signed') return 1.8;
  if (role === 'in-office') return 1.1;
  return 1.3;
}

export function SentimentNetwork() {
  useSeoHead(
    'Presidents x Legislation x Events',
    'Force-directed graph linking administrations to the laws they signed and the events that hit during their terms.',
  );

  const graph = getJson<NetworkGraph>('/data/sentiment/network.json');
  const [showPres, setShowPres] = useState(true);
  const [showLeg, setShowLeg] = useState(true);
  const [showEvt, setShowEvt] = useState(true);
  const [showCross, setShowCross] = useState(true);

  // Run the force simulation via raw DOM manipulation after mount
  useEffect(() => {
    if (!graph) return;

    const container = document.getElementById('net-viz');
    if (!container) return;

    // Clear any previous render
    container.innerHTML = '';

    const width = container.clientWidth || 1000;
    const height = Math.min(window.innerHeight * 0.8, 780);
    container.style.height = `${height}px`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.cursor = 'grab';
    container.appendChild(svg);

    const rootG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(rootG);

    // Zoom via mouse wheel
    let transform = { x: 0, y: 0, k: 1 };
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
      transform.k = Math.max(0.3, Math.min(4, transform.k * scaleFactor));
      rootG.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
    });

    // Pan via mouse drag on svg background
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    svg.addEventListener('mousedown', (e) => {
      if ((e.target as Element) === svg) {
        isPanning = true;
        panStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        svg.style.cursor = 'grabbing';
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        transform.x = e.clientX - panStart.x;
        transform.y = e.clientY - panStart.y;
        rootG.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
      }
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      svg.style.cursor = 'grab';
    });

    // Tooltip
    let tooltip = document.getElementById('net-tooltip-specifyjs');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'net-tooltip-specifyjs';
      Object.assign(tooltip.style, {
        position: 'absolute',
        pointerEvents: 'none',
        background: 'rgba(29, 53, 87, 0.96)',
        color: '#fff',
        padding: '8px 10px',
        borderRadius: '4px',
        fontSize: '0.82rem',
        lineHeight: '1.3',
        maxWidth: '320px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.12s ease',
        zIndex: '1000',
      });
      document.body.appendChild(tooltip);
    }

    // Initialize nodes and links
    const nodes: SimNode[] = graph.nodes.map(d => ({
      ...d,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0, vy: 0,
      fx: null, fy: null,
    }));

    const nodeMap = new Map<string, SimNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const links: SimLink[] = graph.links
      .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map(l => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        role: l.role,
        weight: l.weight,
      }));

    // Create SVG elements
    const linkG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rootG.appendChild(linkG);
    rootG.appendChild(nodeG);

    const linkEls: SVGLineElement[] = links.map(l => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', linkColor(l.role));
      line.setAttribute('stroke-opacity', '0.55');
      line.setAttribute('stroke-width', String(linkWidth(l.role)));
      const dash = linkDash(l.role);
      if (dash) line.setAttribute('stroke-dasharray', dash);
      linkG.appendChild(line);
      return line;
    });

    const nodeEls: SVGGElement[] = nodes.map(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node');
      g.style.cursor = 'pointer';

      if (n.type === 'president') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '18');
        circle.setAttribute('fill', '#6c757d');
        circle.setAttribute('stroke', '#1d3557');
        circle.setAttribute('stroke-width', '2');
        g.appendChild(circle);
        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = shortPresident[n.label] || n.label;
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '32');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', '600');
        text.setAttribute('fill', '#1d3557');
        text.style.pointerEvents = 'none';
        g.appendChild(text);
      } else if (n.type === 'legislation') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '18');
        rect.setAttribute('height', '18');
        rect.setAttribute('x', '-9');
        rect.setAttribute('y', '-9');
        rect.setAttribute('fill', nodeFill(n));
        rect.setAttribute('stroke', '#333');
        rect.setAttribute('stroke-width', '1');
        g.appendChild(rect);
      } else if (n.type === 'event') {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '0,-12 11,8 -11,8');
        poly.setAttribute('fill', nodeFill(n));
        poly.setAttribute('stroke', '#333');
        poly.setAttribute('stroke-width', '1');
        g.appendChild(poly);
      }

      // Tooltip handlers
      g.addEventListener('mousemove', (ev: MouseEvent) => {
        const parts = [`<b>${n.label}</b>`];
        if (n.type === 'president') {
          parts.push(`Party: ${n.party || ''}`);
          if (n.meta) parts.push(n.meta);
        } else {
          parts.push(`Type: ${n.type === 'legislation' ? 'Legislation' : 'Event'}`);
          if (n.date) parts.push(`Date: ${n.date}`);
          if (n.sentiment != null) parts.push(`Sentiment: ${n.sentiment.toFixed(2)}`);
          if (n.meta) parts.push(n.meta);
        }
        tooltip!.innerHTML = parts.join('<br>');
        tooltip!.style.left = (ev.pageX + 12) + 'px';
        tooltip!.style.top = (ev.pageY + 12) + 'px';
        tooltip!.style.opacity = '1';
      });
      g.addEventListener('mouseleave', () => {
        tooltip!.style.opacity = '0';
      });

      // Drag
      let dragging = false;
      g.addEventListener('mousedown', (ev: MouseEvent) => {
        ev.stopPropagation();
        dragging = true;
        n.fx = n.x;
        n.fy = n.y;
      });
      window.addEventListener('mousemove', (ev: MouseEvent) => {
        if (dragging) {
          const rect = svg.getBoundingClientRect();
          const svgX = (ev.clientX - rect.left - transform.x) / transform.k;
          const svgY = (ev.clientY - rect.top - transform.y) / transform.k;
          n.fx = svgX;
          n.fy = svgY;
        }
      });
      window.addEventListener('mouseup', () => {
        dragging = false;
      });

      // Double-click to unpin
      g.addEventListener('dblclick', () => {
        n.fx = null;
        n.fy = null;
      });

      nodeG.appendChild(g);
      return g;
    });

    // Simple force simulation (no D3 dependency)
    const alpha = { value: 1.0 };
    const alphaDecay = 0.0228;
    const alphaMin = 0.001;
    const velocityDecay = 0.6;

    function tick() {
      if (alpha.value < alphaMin) return;

      // Center force
      const cx = width / 2;
      const cy = height / 2;
      nodes.forEach(n => {
        n.vx += (cx - n.x) * 0.01 * alpha.value;
        n.vy += (cy - n.y) * 0.01 * alpha.value;
      });

      // Charge (repulsion)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const strengthA = a.type === 'president' ? -900 : -260;
          const strengthB = b.type === 'president' ? -900 : -260;
          const strength = (strengthA + strengthB) / 2 * alpha.value;
          const force = strength / (dist * dist);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // Link force
      links.forEach(l => {
        const targetDist = l.role === 'in-office' ? 90 : 130;
        const strength = l.role === 'in-office' ? 0.7 : 0.35;
        let dx = l.target.x - l.source.x;
        let dy = l.target.y - l.source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const displacement = (dist - targetDist) / dist * strength * alpha.value;
        const fx = dx * displacement * 0.5;
        const fy = dy * displacement * 0.5;
        l.source.vx += fx;
        l.source.vy += fy;
        l.target.vx -= fx;
        l.target.vy -= fy;
      });

      // Collide
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const rA = a.type === 'president' ? 30 : 18;
          const rB = b.type === 'president' ? 30 : 18;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = rA + rB;
          if (dist < minDist) {
            const overlap = (minDist - dist) / dist * 0.5;
            a.x -= dx * overlap;
            a.y -= dy * overlap;
            b.x += dx * overlap;
            b.y += dy * overlap;
          }
        }
      }

      // Apply velocities
      nodes.forEach(n => {
        if (n.fx != null) { n.x = n.fx; n.vx = 0; }
        else { n.vx *= velocityDecay; n.x += n.vx; }
        if (n.fy != null) { n.y = n.fy; n.vy = 0; }
        else { n.vy *= velocityDecay; n.y += n.vy; }
      });

      // Update SVG
      linkEls.forEach((el, i) => {
        const l = links[i];
        el.setAttribute('x1', String(l.source.x));
        el.setAttribute('y1', String(l.source.y));
        el.setAttribute('x2', String(l.target.x));
        el.setAttribute('y2', String(l.target.y));
      });
      nodeEls.forEach((el, i) => {
        el.setAttribute('transform', `translate(${nodes[i].x},${nodes[i].y})`);
      });

      alpha.value *= (1 - alphaDecay);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Expose filter function on container for checkbox changes
    (container as any).__applyFilters = () => {
      const typeVisible = (t: string) =>
        (t === 'president' && showPres) ||
        (t === 'legislation' && showLeg) ||
        (t === 'event' && showEvt);

      nodeEls.forEach((el, i) => {
        el.style.display = typeVisible(nodes[i].type) ? '' : 'none';
      });
      linkEls.forEach((el, i) => {
        const l = links[i];
        const sv = typeVisible(l.source.type);
        const tv = typeVisible(l.target.type);
        if (!sv || !tv) { el.style.display = 'none'; return; }
        if ((l.role === 'supported' || l.role === 'opposed') && !showCross) {
          el.style.display = 'none'; return;
        }
        el.style.display = '';
      });
    };

    // Reset layout button
    const resetBtn = document.getElementById('net-reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        nodes.forEach(n => { n.fx = null; n.fy = null; });
        alpha.value = 1;
        requestAnimationFrame(tick);
      };
    }

    return () => {
      // Cleanup tooltip on unmount
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    };
  }, [graph]);

  // Apply filters when toggles change
  useEffect(() => {
    const container = document.getElementById('net-viz');
    if (container && (container as any).__applyFilters) {
      (container as any).__applyFilters();
    }
  }, [showPres, showLeg, showEvt, showCross]);

  if (!graph) return h(Loading, null);

  const checkboxStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    margin: '0',
    cursor: 'pointer',
  };

  return h('div', null,
    h('h1', null, 'Presidents \u00D7 Legislation \u00D7 Events'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Force-directed graph linking administrations to the laws they signed and the events that hit during their terms',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'Each ',
      h('strong', null, 'grey circle'),
      ' is a presidential administration. Each ',
      h('strong', null, 'square'),
      ' is a piece of legislation; each ',
      h('strong', null, 'triangle'),
      ' is a world event. ',
      h('strong', null, 'Colour'),
      ' goes red \u2192 amber \u2192 green along sentiment (\u22121 extreme negative \u2192 0 neutral \u2192 +1 extreme positive).',
    ),

    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      h('strong', null, 'Links:'),
      ' solid grey lines connect presidents to events that happened during their term and to legislation they signed. Dashed red lines show presidents who publicly opposed legislation from other terms; solid green lines show cross-term support. Line thickness tracks link strength.',
    ),

    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Drag a node to pin it; scroll/pinch to zoom; hover for details.',
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        h('strong', null, 'Sentiment values are editorial first-pass estimates'),
        ' anchored on contemporaneous polling and NBER/FBI/public indicators. They are stored in plain CSVs under data/sentiment/ \u2014 legislation.csv and events.csv \u2014 and are intended to be refined as we swap in derived sentiment from GDELT/Media Cloud and issue-specific polling. See the ',
        h('a', { href: '#/sentiment/about' }, 'Methodology'),
        ' page for full caveats.',
      ),
    ),

    // Controls
    h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        padding: '10px 12px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        fontSize: '0.9rem',
        marginBottom: '12px',
      },
    },
      h('strong', null, 'Show:'),
      h('label', { style: checkboxStyle },
        h('input', { type: 'checkbox', checked: showPres, onChange: () => setShowPres(!showPres) }),
        ' Presidents',
      ),
      h('label', { style: checkboxStyle },
        h('input', { type: 'checkbox', checked: showLeg, onChange: () => setShowLeg(!showLeg) }),
        ' Legislation',
      ),
      h('label', { style: checkboxStyle },
        h('input', { type: 'checkbox', checked: showEvt, onChange: () => setShowEvt(!showEvt) }),
        ' Events',
      ),
      h('label', { style: checkboxStyle },
        h('input', { type: 'checkbox', checked: showCross, onChange: () => setShowCross(!showCross) }),
        ' Cross-term support/opposition',
      ),
      h('button', {
        id: 'net-reset-btn',
        type: 'button',
        style: { marginLeft: 'auto', padding: '3px 10px' },
      }, 'Reset layout'),
    ),

    // Legend
    h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        padding: '10px 12px',
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        fontSize: '0.88rem',
        marginBottom: '12px',
      },
    },
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        h('span', {
          style: {
            display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%',
            background: '#6c757d', border: '1px solid #333',
          },
        }),
        'President',
      ),
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        h('span', {
          style: {
            display: 'inline-block', width: '18px', height: '18px',
            background: '#bc4749', border: '1px solid #333',
          },
        }),
        'Legislation',
      ),
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
        h('span', {
          style: {
            display: 'inline-block', width: '0', height: '0',
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
            borderBottom: '16px solid #2f9e44',
          },
        }),
        'Event',
      ),
      h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' } },
        h('span', null, '\u22121'),
        h('span', {
          style: {
            width: '180px', height: '12px', borderRadius: '3px',
            background: 'linear-gradient(to right, #d62828, #f2c14e, #2f9e44)',
            border: '1px solid #adb5bd',
          },
        }),
        h('span', null, '+1'),
      ),
    ),

    // Visualization container
    h('div', {
      id: 'net-viz',
      style: {
        width: '100%',
        minHeight: '500px',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        background: '#ffffff',
        overflow: 'hidden',
      },
    }),

    // Reading the graph
    h('h2', null, 'Reading the graph'),
    h('ul', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'Cluster shape'),
        ' \u2014 presidents and their in-term items form radial lobes. Events and legislation sit at ~equal distance from their president node because link distances are equal across in-term links.',
      ),
      h('li', null,
        h('strong', null, 'Cross-term edges'),
        ' (dashed red / dotted green) pull certain legislation between two presidents, shortening the distance to the supporter/opposer and visually connecting administrations that took positions on someone else\'s law.',
      ),
      h('li', null,
        h('strong', null, 'Drag a president'),
        ' to pin it; the rest of the graph reorganizes around that fixed point. Double-click a node to release the pin.',
      ),
    ),

    // Data sources
    h('h2', null, 'Data sources'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Stored in two CSVs under data/sentiment/:',
    ),
    h('ul', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'legislation.csv'),
        ' \u2014 hand-curated list of major 1999-to-present US federal legislation with contemporaneous sentiment estimates, the president who signed, and (optional) cross-term supported_by / opposed_by keys.',
      ),
      h('li', null,
        h('strong', null, 'events.csv'),
        ' \u2014 world and domestic events with a sentiment estimate and severity tag. Already used by the Economic and Media Sentiment pages for event-line overlays.',
      ),
    ),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'The graph is assembled by R/build_network.R and emitted as data/sentiment/network.json, consumed on this page. Re-running the build is cheap: no external API calls, just CSV \u2192 JSON.',
    ),

    // Where sentiment comes from
    h('h2', null, 'Where sentiment comes from (and should come from)'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Current sentiment values are ',
      h('strong', null, 'editorial'),
      ' \u2014 a single author\'s reading of contemporaneous polling, NBER/FBI indicators, and published retrospective commentary. The intention is that the numbers evolve as we plug in derived signals:',
    ),
    h('ul', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'GDELT tone'),
        ' around the signing date (already cached on the Media Sentiment page) gives a media-framing signal per legislation.',
      ),
      h('li', null,
        h('strong', null, 'Media Cloud volume'),
        ' lets us weight the signal by how much coverage each law received.',
      ),
      h('li', null,
        h('strong', null, 'Issue-specific polling'),
        ' (Pew, Gallup issue tracking) would ground the approval estimate.',
      ),
    ),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Until then, the CSVs are plain-text and sit under version control \u2014 each score has a notes field explaining the anchor. PRs welcome.',
    ),
  );
}
