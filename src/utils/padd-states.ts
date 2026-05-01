/**
 * PADD (Petroleum Administration for Defense Districts) region to state mapping.
 * Used by energy choropleth maps.
 */

export const paddToStates: Record<string, string[]> = {
  'PADD 1': ['CT', 'DC', 'DE', 'FL', 'GA', 'MA', 'MD', 'ME', 'NC', 'NH', 'NJ', 'NY', 'PA', 'RI', 'SC', 'VA', 'VT', 'WV'],
  'PADD 2': ['IA', 'IL', 'IN', 'KS', 'KY', 'MI', 'MN', 'MO', 'ND', 'NE', 'OH', 'OK', 'SD', 'TN', 'WI'],
  'PADD 3': ['AL', 'AR', 'LA', 'MS', 'NM', 'TX'],
  'PADD 4': ['CO', 'ID', 'MT', 'UT', 'WY'],
  'PADD 5': ['AK', 'AZ', 'CA', 'HI', 'NV', 'OR', 'WA'],
};

/** Get the PADD region for a state code */
export function stateToPadd(stateCode: string): string | undefined {
  for (const [padd, states] of Object.entries(paddToStates)) {
    if (states.includes(stateCode)) return padd;
  }
  return undefined;
}

/** Build a mapping from state code to a value based on PADD data */
export function paddToStateValues(paddData: Record<string, number>): Record<string, number> {
  const stateValues: Record<string, number> = {};
  for (const [padd, states] of Object.entries(paddToStates)) {
    const value = paddData[padd];
    if (value != null) {
      for (const state of states) {
        stateValues[state] = value;
      }
    }
  }
  return stateValues;
}
