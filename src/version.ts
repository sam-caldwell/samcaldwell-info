declare const __APP_VERSION__: string;
declare const __BUILD_TIMESTAMP__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';
export const BUILD_TIMESTAMP: string = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : new Date().toISOString();

/** Format build timestamp for display: "YYYY-MM-DD HH:MM UTC" */
export function formatBuildTimestamp(): string {
  const d = new Date(BUILD_TIMESTAMP);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}
