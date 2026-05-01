// TypeScript interfaces for all CSV data schemas

export interface AnnualEconomy {
  year: number;
  gdp_growth: number | null;
  unemployment: number;
  cpi: number | null;
  fed_funds: number;
  ten_year: number;
  recession: number;
  deficit_pct_gdp: number;
  debt_pct_gdp_eoy: number;
  debt_trillion_eoy: number;
  sp500_ret: number;
  dow_ret: number;
  nasdaq_ret: number;
  vix_avg: number;
  debt_added_trillion: number | null;
  prototype: number;
}

export interface QuarterlyEconomy {
  year: number;
  quarter: number;
  gdp_growth: number;
  unemployment: number;
  cpi: number;
}

export interface MonthlyEconomy {
  year: number;
  month: number;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
}

export interface GdpComponents {
  year: number;
  consumption: number;
  investment: number;
  government: number;
  net_exports: number;
}

export interface SectorReturn {
  year: number;
  sector: string;
  return_pct: number;
}

export interface FiscalQuarterly {
  year: number;
  quarter: number;
  debt_trillion: number;
  debt_pct_gdp: number;
}

export interface Administration {
  president: string;
  party: string;
  start_date: string;
  end_date: string;
  ongoing: number;
}

export interface MonthlyAdmin {
  year: number;
  month: number;
  date: string;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
  vix: number;
  sp500_level: number;
  president: string;
  party: string;
  ongoing: number;
}

export interface AdminSummary {
  president: string;
  party: string;
  sp500_total_return: number;
  debt_added_trillion: number;
  avg_annual_debt_added_trillion: number;
}

export interface AdminSentiment {
  president: string;
  party: string;
  start_date: string;
  end_date: string;
  ongoing: number;
  umcsent_avg: number | null;
  umcsent_min: number | null;
  umcsent_max: number | null;
  months: number;
  umcsent_vs_baseline: number | null;
  gallup_avg: number | null;
  gallup_min: number | null;
  gallup_max: number | null;
  gallup_last: number | null;
  gallup_vs_baseline: number | null;
  tone_avg: number | null;
  tone_min: number | null;
  tone_max: number | null;
  tone_months: number | null;
  tone_vs_baseline: number | null;
  mc_stories_per_month_avg: number | null;
  mc_stories_total: number | null;
  mc_months: number | null;
}

export interface GallupApproval {
  president: string;
  party: string;
  avg_approval: number;
  min_approval: number;
  max_approval: number;
  last_approval?: number;
  notes?: string;
}

export interface UmcsentMonthly {
  date: string;
  umcsent: number;
  president: string;
  party: string;
}

export interface GdeltToneMonthly {
  date: string;
  tone: number;
  president: string;
  party: string;
}

export interface WorldEvent {
  date: string;
  category: string;
  event: string;
  severity: number;
  sentiment: number;
}

export interface SocietyScore {
  president: string;
  party: string;
  aspect: string;
  score: number;
  notes: string;
}

export interface Legislation {
  id: string;
  name: string;
  signed_date: string;
  signed_by: string;
  category: string;
  sentiment: number;
  short_description: string;
  supported_by: string;
  opposed_by: string;
  notes: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'president' | 'legislation' | 'event';
  party?: string;
  sentiment?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  meta?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  role: 'signed' | 'in-office' | 'opposed' | 'supported';
  weight?: number;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface CurrentThreat {
  snapshot_date: string;
  source: string;
  ip: string;
  port: number;
  status: string;
  malware_family: string;
  country: string;
  region_name: string;
  city: string;
  lat: number;
  lon: number;
  as_name: string;
  first_seen: string;
  last_online: string;
}

export interface CurrentBotnet {
  snapshot_date: string;
  ip: string;
  port: number;
  status: string;
  malware_family: string;
  country: string;
  region_name: string;
  city: string;
  lat: number;
  lon: number;
  as_name: string;
  first_seen: string;
  last_online: string;
}

export interface CveKev {
  cve: string;
  vendor_project: string;
  product: string;
  vulnerability_name: string;
  cvss_v3_base: number;
  cvss_v3_severity: string;
  initial_epss: number;
  current_epss: number;
  epss_delta: number;
  date_added: string;
}

export interface CvesSummary {
  as_of: string;
  kev_total: number;
  kev_added_30d: number;
  top_epss: string;
  top_epss_score: number;
  median_epss: number;
  median_cvss_v3: number;
}

export interface ThreatsSummary {
  as_of: string;
  total_ips_today: number;
  total_botnet_ips_today: number;
  provinces_today: number;
  countries_today: number;
  top_malware_today: string;
  snapshots_accumulated: number;
}

export interface UsPricesDaily {
  date: string;
  wti: number;
  brent: number;
  natgas: number;
}

export interface PaddGasCurrent {
  duoarea: string;
  area_name: string;
  price_now: number;
  price_prior: number;
  wow_change: number;
}

export interface PaddGas10y {
  duoarea: string;
  area_name: string;
  pct_change_10y: number;
  abs_change_10y: number;
  price_10y_ago: number;
  price_now: number;
  date_10y_ago: string;
}

export interface EnergySummary {
  as_of: string;
  wti_spot: number;
  brent_spot: number;
  us_retail_gasoline: number;
  henry_hub_natgas: number;
  us_crude_production_mbd: number;
}

export interface EnergyEvent {
  date: string;
  category: string;
  event: string;
  sentiment: number;
  notes: string;
}

export interface SupplyDemandRow {
  date: string;
  us_crude_prod: number;
  us_crude_stocks: number;
  us_gas_demand: number;
}

export interface SteoForecast {
  date: string;
  series_id: string;
  value: number;
}

export interface UnemploymentMonthly {
  date: string;
  geo: string;
  geo_label: string;
  unemployment_rate: number;
}

export interface IncomeAnnual {
  year: number;
  geo: string;
  geo_label: string;
  per_capita_income: number;
}

export interface GdpAnnual {
  year: number;
  geo: string;
  geo_label: string;
  gdp: number;
  gdp_growth_pct: number;
}

export interface WestTexasSummary {
  [key: string]: string | number;
}
