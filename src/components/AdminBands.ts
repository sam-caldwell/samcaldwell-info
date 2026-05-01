import type { Administration } from '../types.js';
import { partyColors } from '../theme.js';

/**
 * Compute admin band data for chart overlays.
 * Returns an array of colored bands to render behind charts.
 */
export interface AdminBand {
  start: string;
  end: string;
  president: string;
  party: string;
  color: string;
  opacity: number;
}

export function computeAdminBands(admins: Administration[]): AdminBand[] {
  return admins.map(a => ({
    start: a.start_date,
    end: a.end_date,
    president: a.president,
    party: a.party,
    color: partyColors[a.party as keyof typeof partyColors] || '#6c757d',
    opacity: 0.12,
  }));
}
