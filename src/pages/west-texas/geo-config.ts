/**
 * Shared geo configuration for the 30-county West Texas region.
 * Source: Texas Comptroller https://comptroller.texas.gov/economy/economic-data/regions/2020/snap-west.php
 */

export const COUNTIES = [
  'andrews', 'borden', 'coke', 'concho', 'crane', 'crockett', 'dawson', 'ector',
  'gaines', 'glasscock', 'howard', 'irion', 'kimble', 'loving', 'martin', 'mason',
  'mcculloch', 'menard', 'midland', 'pecos', 'reagan', 'reeves', 'schleicher',
  'sterling', 'sutton', 'terrell', 'tom_green', 'upton', 'ward', 'winkler',
] as const;

export type CountyKey = typeof COUNTIES[number];

export const geoNames: Record<string, string> = {
  US: 'United States',
  TX: 'Texas',
  andrews: 'Andrews Co. (Andrews)',       borden: 'Borden Co. (Gail)',
  coke: 'Coke Co. (Robert Lee)',         concho: 'Concho Co. (Paint Rock)',
  crane: 'Crane Co. (Crane)',            crockett: 'Crockett Co. (Ozona)',
  dawson: 'Dawson Co. (Lamesa)',         ector: 'Ector Co. (Odessa)',
  gaines: 'Gaines Co. (Seminole)',       glasscock: 'Glasscock Co. (Garden City)',
  howard: 'Howard Co. (Big Spring)',     irion: 'Irion Co. (Mertzon)',
  kimble: 'Kimble Co. (Junction)',       loving: 'Loving Co. (Mentone)',
  martin: 'Martin Co. (Stanton)',        mason: 'Mason Co. (Mason)',
  mcculloch: 'McCulloch Co. (Brady)',    menard: 'Menard Co. (Menard)',
  midland: 'Midland Co. (Midland)',      pecos: 'Pecos Co. (Fort Stockton)',
  reagan: 'Reagan Co. (Big Lake)',       reeves: 'Reeves Co. (Pecos)',
  schleicher: 'Schleicher Co. (Eldorado)', sterling: 'Sterling Co. (Sterling City)',
  sutton: 'Sutton Co. (Sonora)',         terrell: 'Terrell Co. (Sanderson)',
  tom_green: 'Tom Green Co. (San Angelo)', upton: 'Upton Co. (Rankin)',
  ward: 'Ward Co. (Monahans)',           winkler: 'Winkler Co. (Kermit)',
};

/** Colors for benchmark lines (US, TX) and a palette for counties */
export const benchmarkColors: Record<string, string> = {
  US: '#1d3557',
  TX: '#2a6f97',
};

/** Rotating color palette for county lines when charting */
const COUNTY_PALETTE = [
  '#e07a5f', '#6a4c93', '#2f9e44', '#f2c14e', '#bc4749', '#1d3557',
  '#d4a373', '#588157', '#c1121f', '#669bbc', '#a68a64', '#3a86ff',
  '#fb5607', '#8338ec', '#06d6a0', '#ef476f', '#118ab2', '#ffd166',
  '#073b4c', '#e5989b', '#b5838d', '#6d6875', '#cdb4db', '#a2d2ff',
  '#ff006e', '#8ac926', '#6a4c93', '#1982c4', '#ffbe0b', '#f72585',
];

export function getCountyColor(county: string): string {
  const idx = COUNTIES.indexOf(county as CountyKey);
  if (idx >= 0) return COUNTY_PALETTE[idx % COUNTY_PALETTE.length];
  return '#6c757d';
}
