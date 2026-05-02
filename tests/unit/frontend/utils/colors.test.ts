import { describe, test, expect } from 'bun:test';
import { lerpColor, sentimentColor, valueColor } from '../../../../src/utils/colors';

describe('lerpColor', () => {
  test('t=0 returns first color', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
  });

  test('t=1 returns second color', () => {
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  test('t=0.5 returns midpoint grey', () => {
    const result = lerpColor('#000000', '#ffffff', 0.5);
    // Should be approximately #808080 (128,128,128)
    expect(result).toBe('#808080');
  });

  test('interpolates between arbitrary colors', () => {
    const result = lerpColor('#ff0000', '#0000ff', 0.5);
    // R: 128, G: 0, B: 128
    expect(result).toBe('#800080');
  });
});

describe('sentimentColor', () => {
  test('-1 is reddish (the red endpoint)', () => {
    const color = sentimentColor(-1);
    // At -1: lerpColor(red, amber, 0) => red = #d62828
    expect(color).toBe('#d62828');
  });

  test('0 is amber', () => {
    const color = sentimentColor(0);
    // At 0: lerpColor(red, amber, 1) => amber = #f2c14e
    expect(color).toBe('#f2c14e');
  });

  test('1 is greenish', () => {
    const color = sentimentColor(1);
    // At 1: lerpColor(amber, green, 1) => green = #2f9e44
    expect(color).toBe('#2f9e44');
  });

  test('-0.5 is between red and amber', () => {
    const color = sentimentColor(-0.5);
    // t = 0.5 between red and amber
    expect(color).not.toBe('#d62828');
    expect(color).not.toBe('#f2c14e');
  });
});

describe('valueColor', () => {
  test('at min returns green', () => {
    const color = valueColor(0, 0, 100);
    expect(color).toBe('#2f9e44');
  });

  test('at max returns red', () => {
    const color = valueColor(100, 0, 100);
    expect(color).toBe('#bc4749');
  });

  test('at midpoint returns intermediate color', () => {
    const color = valueColor(50, 0, 100);
    expect(color).not.toBe('#2f9e44');
    expect(color).not.toBe('#bc4749');
  });

  test('when min equals max returns amber', () => {
    expect(valueColor(5, 5, 5)).toBe('#f2c14e');
  });

  test('clamps below min to green', () => {
    expect(valueColor(-10, 0, 100)).toBe('#2f9e44');
  });

  test('clamps above max to red', () => {
    expect(valueColor(200, 0, 100)).toBe('#bc4749');
  });
});
