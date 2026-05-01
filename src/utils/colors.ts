/**
 * Color utilities for sentiment visualization.
 * HCL interpolation between red -> amber -> green based on sentiment score.
 */

/** Interpolate between two hex colors. t in [0, 1] */
export function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return rgbToHex(r, g, bl);
}

/** Map a sentiment score [-1, 1] to a color (red -> amber -> green) */
export function sentimentColor(score: number): string {
  const red = '#d62828';
  const amber = '#f2c14e';
  const green = '#2f9e44';

  if (score <= 0) {
    // -1 to 0 maps to red -> amber
    const t = (score + 1); // 0 to 1
    return lerpColor(red, amber, t);
  } else {
    // 0 to 1 maps to amber -> green
    return lerpColor(amber, green, score);
  }
}

/** Map a value in [min, max] to a color scale (green -> amber -> red) */
export function valueColor(value: number, min: number, max: number): string {
  if (max === min) return '#f2c14e';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // low = green, high = red
  return lerpColor('#2f9e44', '#bc4749', t);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
