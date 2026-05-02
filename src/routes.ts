// --- Page imports ---
import { Home } from './pages/Home.js';
import { EconomyIndex } from './pages/economy/EconomyIndex.js';
import { EconomyGrowth } from './pages/economy/EconomyGrowth.js';
import { EconomyIndicators } from './pages/economy/EconomyIndicators.js';
import { EconomyUnemployment } from './pages/economy/EconomyUnemployment.js';
import { EconomyMarkets } from './pages/economy/EconomyMarkets.js';
import { EconomyAbout } from './pages/economy/EconomyAbout.js';
import { PresidentialIndex } from './pages/presidential/PresidentialIndex.js';
import { PresidentialGrowth } from './pages/presidential/PresidentialGrowth.js';
import { PresidentialMarkets } from './pages/presidential/PresidentialMarkets.js';
import { PresidentialFiscal } from './pages/presidential/PresidentialFiscal.js';
import { PresidentialAbout } from './pages/presidential/PresidentialAbout.js';
import { SentimentIndex } from './pages/sentiment/SentimentIndex.js';
import { SentimentApproval } from './pages/sentiment/SentimentApproval.js';
import { SentimentEconomic } from './pages/sentiment/SentimentEconomic.js';
import { SentimentMedia } from './pages/sentiment/SentimentMedia.js';
import { SentimentSociety } from './pages/sentiment/SentimentSociety.js';
import { SentimentNetwork } from './pages/sentiment/SentimentNetwork.js';
import { SentimentAbout } from './pages/sentiment/SentimentAbout.js';
import { CyberIndex } from './pages/cybersecurity/CyberIndex.js';
import { CyberThreats } from './pages/cybersecurity/CyberThreats.js';
import { CyberBotnets } from './pages/cybersecurity/CyberBotnets.js';
import { CyberCves } from './pages/cybersecurity/CyberCves.js';
import { CyberAbout } from './pages/cybersecurity/CyberAbout.js';
import { EnergyIndex } from './pages/energy/EnergyIndex.js';
import { EnergyUsMarkets } from './pages/energy/EnergyUsMarkets.js';
import { EnergyIntlMarkets } from './pages/energy/EnergyIntlMarkets.js';
import { EnergySupplyDemand } from './pages/energy/EnergySupplyDemand.js';
import { EnergyEvents } from './pages/energy/EnergyEvents.js';
import { EnergyForecasts } from './pages/energy/EnergyForecasts.js';
import { EnergyPricesMap } from './pages/energy/EnergyPricesMap.js';
import { EnergyChangeMap } from './pages/energy/EnergyChangeMap.js';
import { EnergyAbout } from './pages/energy/EnergyAbout.js';
import { WestTexasIndex } from './pages/west-texas/WestTexasIndex.js';
import { WestTexasUnemployment } from './pages/west-texas/WestTexasUnemployment.js';
import { WestTexasIncome } from './pages/west-texas/WestTexasIncome.js';
import { WestTexasGdp } from './pages/west-texas/WestTexasGdp.js';
import { WestTexasAbout } from './pages/west-texas/WestTexasAbout.js';
import { FccIndex } from './pages/fcc/FccIndex.js';
import { FccByType } from './pages/fcc/FccByType.js';
import { FccByYear } from './pages/fcc/FccByYear.js';
import { FccHamDecisions } from './pages/fcc/FccHamDecisions.js';
import { FccGmrsDecisions } from './pages/fcc/FccGmrsDecisions.js';
import { FccGmrsFelony } from './pages/fcc/FccGmrsFelony.js';
import { FccAbout } from './pages/fcc/FccAbout.js';

export interface RouteConfig {
  path: string;
  component: Function;
  exact?: boolean;
  title: string;
  description: string;
}

export const routes: RouteConfig[] = [
  // Home
  { path: '/', component: Home, exact: true, title: 'Home', description: 'Interactive visual analyses of public topics.' },

  // Economy
  { path: '/economy', component: EconomyIndex, exact: true, title: 'US Economy', description: 'Visual analysis of US economic indicators and markets from 1999 to the present.' },
  { path: '/economy/growth', component: EconomyGrowth, exact: true, title: 'Economic Growth', description: 'Real GDP growth analysis with drill-down by quarter and component.' },
  { path: '/economy/indicators', component: EconomyIndicators, exact: true, title: 'Indicators', description: 'Unemployment, inflation, rates, and VIX dashboard.' },
  { path: '/economy/unemployment', component: EconomyUnemployment, exact: true, title: 'Unemployment', description: 'Monthly unemployment with rolling averages and administration overlay.' },
  { path: '/economy/markets', component: EconomyMarkets, exact: true, title: 'Economy vs Markets', description: 'Correlations between economic indicators and market returns by sector.' },
  { path: '/economy/about', component: EconomyAbout, exact: true, title: 'Economy Data & Citations', description: 'Data dictionary, provenance notes, and attribution.' },

  // Presidential Economies
  { path: '/presidential', component: PresidentialIndex, exact: true, title: 'Presidential Economies', description: 'Economic indicators compared by administration.' },
  { path: '/presidential/growth', component: PresidentialGrowth, exact: true, title: 'Growth by Admin', description: 'GDP growth compared across presidential administrations.' },
  { path: '/presidential/markets', component: PresidentialMarkets, exact: true, title: 'Markets by Admin', description: 'Market performance per administration.' },
  { path: '/presidential/fiscal', component: PresidentialFiscal, exact: true, title: 'Fiscal by Admin', description: 'Debt and deficit analysis by administration.' },
  { path: '/presidential/about', component: PresidentialAbout, exact: true, title: 'Presidential Methodology', description: 'Methodology for presidential economic comparisons.' },

  // Sentiment
  { path: '/sentiment', component: SentimentIndex, exact: true, title: 'Public Sentiment', description: 'Three measures of public mood per administration.' },
  { path: '/sentiment/approval', component: SentimentApproval, exact: true, title: 'Political Approval', description: 'Gallup approval ratings per administration.' },
  { path: '/sentiment/economic', component: SentimentEconomic, exact: true, title: 'Economic Sentiment', description: 'U. Michigan Consumer Sentiment by administration.' },
  { path: '/sentiment/media', component: SentimentMedia, exact: true, title: 'Media Sentiment', description: 'GDELT average media tone by administration.' },
  { path: '/sentiment/society', component: SentimentSociety, exact: true, title: 'Society Radar', description: 'Multi-aspect sentiment scores per administration.' },
  { path: '/sentiment/network', component: SentimentNetwork, exact: true, title: 'Network Graph', description: 'Force-directed graph of presidents, legislation, and events.' },
  { path: '/sentiment/about', component: SentimentAbout, exact: true, title: 'Sentiment Methodology', description: 'Methodology for sentiment analysis.' },

  // Cybersecurity
  { path: '/cybersecurity', component: CyberIndex, exact: true, title: 'Cybersecurity', description: 'Active threat infrastructure and KEV catalog.' },
  { path: '/cybersecurity/threats', component: CyberThreats, exact: true, title: 'Threat Sources', description: 'World map of active threat IPs from FeodoTracker and ThreatFox.' },
  { path: '/cybersecurity/botnets', component: CyberBotnets, exact: true, title: 'Botnet Hosts', description: 'Botnet-infected IP summary by country and family.' },
  { path: '/cybersecurity/cves', component: CyberCves, exact: true, title: 'CVEs in the Wild', description: 'CISA Known Exploited Vulnerabilities with EPSS and CVSS data.' },
  { path: '/cybersecurity/about', component: CyberAbout, exact: true, title: 'Cybersecurity Methodology', description: 'Data sources and methodology for cybersecurity analysis.' },

  // Energy
  { path: '/energy', component: EnergyIndex, exact: true, title: 'Energy', description: 'US and international energy markets overview.' },
  { path: '/energy/us-markets', component: EnergyUsMarkets, exact: true, title: 'US Energy Markets', description: 'Crude, natural gas, retail gasoline, and electricity prices.' },
  { path: '/energy/intl-markets', component: EnergyIntlMarkets, exact: true, title: 'International Markets', description: 'Global crude and refined product prices.' },
  { path: '/energy/supply-demand', component: EnergySupplyDemand, exact: true, title: 'Supply & Demand', description: 'US energy production, imports, and consumption.' },
  { path: '/energy/events', component: EnergyEvents, exact: true, title: 'Energy Events', description: 'Energy-driven world events and sentiment.' },
  { path: '/energy/forecasts', component: EnergyForecasts, exact: true, title: 'Energy Forecasts', description: 'EIA STEO short-term energy forecasts.' },
  { path: '/energy/prices-map', component: EnergyPricesMap, exact: true, title: 'Fuel Prices Map', description: 'PADD-region retail gasoline prices on a US map.' },
  { path: '/energy/change-map', component: EnergyChangeMap, exact: true, title: '10-Year Price Change', description: 'Historical gasoline price change by PADD region.' },
  { path: '/energy/about', component: EnergyAbout, exact: true, title: 'Energy Methodology', description: 'Data sources and methodology for energy analysis.' },

  // West Texas
  { path: '/west-texas', component: WestTexasIndex, exact: true, title: 'West Texas', description: 'Regional economy of Sonora, Eldorado, Ozona, and Junction.' },
  { path: '/west-texas/unemployment', component: WestTexasUnemployment, exact: true, title: 'West Texas Unemployment', description: 'County-level unemployment vs state and national benchmarks.' },
  { path: '/west-texas/income', component: WestTexasIncome, exact: true, title: 'West Texas Income', description: 'Per-capita income trends for West Texas counties.' },
  { path: '/west-texas/gdp', component: WestTexasGdp, exact: true, title: 'West Texas GDP', description: 'Regional GDP from BEA data.' },
  { path: '/west-texas/about', component: WestTexasAbout, exact: true, title: 'West Texas Methodology', description: 'Data sources and methodology for West Texas analysis.' },

  // FCC Applications
  { path: '/fcc', component: FccIndex, exact: true, title: 'FCC Applications', description: 'Analysis of FCC license applications for Amateur Radio and GMRS.' },
  { path: '/fcc/by-type', component: FccByType, exact: true, title: 'FCC Apps by Type', description: 'FCC license applications by radio service type.' },
  { path: '/fcc/by-year', component: FccByYear, exact: true, title: 'FCC Apps by Year', description: 'Year-over-year FCC application trends.' },
  { path: '/fcc/ham-decisions', component: FccHamDecisions, exact: true, title: 'HAM Decisions', description: 'Amateur Radio license decisions.' },
  { path: '/fcc/gmrs-decisions', component: FccGmrsDecisions, exact: true, title: 'GMRS Decisions', description: 'GMRS license decisions, timing, and pending analysis.' },
  { path: '/fcc/gmrs-felony', component: FccGmrsFelony, exact: true, title: 'GMRS Felony Analysis', description: 'GMRS applications with felony conviction disclosure.' },
  { path: '/fcc/about', component: FccAbout, exact: true, title: 'FCC Methodology', description: 'Data sources and methodology for FCC analysis.' },
];
