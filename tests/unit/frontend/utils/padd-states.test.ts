import { describe, test, expect } from 'bun:test';
import { stateToPadd, paddToStates, paddToStateValues } from '../../../../src/utils/padd-states';

describe('stateToPadd', () => {
  test('TX maps to PADD 3', () => {
    expect(stateToPadd('TX')).toBe('PADD 3');
  });

  test('CA maps to PADD 5', () => {
    expect(stateToPadd('CA')).toBe('PADD 5');
  });

  test('NY maps to PADD 1', () => {
    expect(stateToPadd('NY')).toBe('PADD 1');
  });

  test('IL maps to PADD 2', () => {
    expect(stateToPadd('IL')).toBe('PADD 2');
  });

  test('CO maps to PADD 4', () => {
    expect(stateToPadd('CO')).toBe('PADD 4');
  });

  test('unknown state returns undefined', () => {
    expect(stateToPadd('XX')).toBeUndefined();
  });

  test('empty string returns undefined', () => {
    expect(stateToPadd('')).toBeUndefined();
  });
});

describe('paddToStates', () => {
  test('has 5 PADD regions', () => {
    expect(Object.keys(paddToStates)).toHaveLength(5);
  });

  test('PADD 3 includes TX', () => {
    expect(paddToStates['PADD 3']).toContain('TX');
  });
});

describe('paddToStateValues', () => {
  test('expands PADD values to all states', () => {
    const paddData: Record<string, number> = {
      'PADD 1': 3.50,
      'PADD 3': 2.80,
    };
    const stateValues = paddToStateValues(paddData);

    // PADD 1 states should have 3.50
    expect(stateValues['NY']).toBe(3.50);
    expect(stateValues['FL']).toBe(3.50);

    // PADD 3 states should have 2.80
    expect(stateValues['TX']).toBe(2.80);

    // PADD 2 states should not be present
    expect(stateValues['IL']).toBeUndefined();
  });

  test('handles empty input', () => {
    const stateValues = paddToStateValues({});
    expect(Object.keys(stateValues)).toHaveLength(0);
  });

  test('handles all PADDs', () => {
    const paddData: Record<string, number> = {
      'PADD 1': 1, 'PADD 2': 2, 'PADD 3': 3, 'PADD 4': 4, 'PADD 5': 5,
    };
    const stateValues = paddToStateValues(paddData);
    // Every state in paddToStates should have a value
    for (const [, states] of Object.entries(paddToStates)) {
      for (const state of states) {
        expect(stateValues[state]).toBeDefined();
      }
    }
  });
});
