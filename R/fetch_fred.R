# -----------------------------------------------------------------------------
# fetch_fred.R
#
# Incremental FRED fetcher. One CSV cache per series under data/economy/cache/.
# Only fetches observations since the last cached date; first run bootstraps
# from 1999-12-01 so the site covers from 2000 onward.
#
# *** Only public-domain series are fetched/cached. ***
# Proprietary series (SP500, DJIA, NASDAQCOM, VIXCLS) are prohibited from
# redistribution by FRED's ToS and are NOT included here; market data on the
# site remains synthetic.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(fredr)
  library(dplyr)
  library(readr)
  library(purrr)
  library(tibble)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
CACHE_DIR    <- file.path(PROJECT_ROOT, "data", "economy", "cache")
dir.create(CACHE_DIR, recursive = TRUE, showWarnings = FALSE)

# Public-domain US-government series only.
FRED_SERIES <- list(
  gdp_real         = "GDPC1",       # Real GDP (quarterly, chained $)
  gdp_nominal      = "GDP",         # Nominal GDP (quarterly)
  pce              = "PCEC",        # Personal Consumption Expenditures (quarterly, nominal)
  investment       = "GPDI",        # Gross Private Domestic Investment (quarterly)
  government       = "GCE",         # Government Consumption + Investment (quarterly)
  net_exports      = "NETEXP",      # Net Exports (quarterly)
  unemployment     = "UNRATE",      # Civilian unemployment rate (monthly)
  cpi              = "CPIAUCSL",    # CPI-U, All Items (monthly)
  fed_funds        = "FEDFUNDS",    # Federal Funds Effective Rate (monthly)
  ten_year         = "DGS10",       # 10-Year Treasury CMT (daily)
  recession        = "USREC",       # NBER recession indicator (monthly)
  debt_public      = "GFDEBTN",     # Total public federal debt outstanding (quarterly, $M)
  debt_pct_gdp     = "GFDEGDQ188S", # Federal debt as % of GDP (quarterly)
  deficit_nominal  = "FYFSD",       # Federal surplus/deficit, fiscal year (annual, $M)
  deficit_pct_gdp  = "FYFSGDA188S", # Federal surplus/deficit as % of GDP (annual)
  umcsent          = "UMCSENT",     # U. Michigan Consumer Sentiment Index (monthly)
  # --- Energy-sector series (public domain) --------------------------------
  wti              = "DCOILWTICO",  # WTI Cushing crude oil spot, USD/bbl (daily)
  brent            = "DCOILBRENTEU",# Brent crude spot, USD/bbl (daily)
  gas_retail_us    = "GASREGW",     # US Regular gasoline retail, USD/gal (weekly)
  natgas_henry_hub = "DHHNGSP",     # Henry Hub natural-gas spot, $/MMBtu (daily)
  elec_retail_us   = "APU000074714",# US avg electricity price per kWh (monthly)
  # NB: FRED no longer exposes WCRFPUS2/WCESTUS1/WGFUPUS2. US crude
  # production / stocks / gasoline-demand weekly series come from the EIA
  # API instead; see R/fetch_eia.R.
  # --- Texas state-level series (public domain, BLS/BEA via FRED) -----------
  tx_unemployment  = "TXUR",       # Texas unemployment rate (monthly, BLS LAUS)
  tx_rgsp          = "TXRGSP"      # Texas real gross state product (annual, BEA)
)

# Fetch from 1998-01-01 so we have the prior-year observations needed to
# compute YoY figures for calendar year 1999 (the first displayed year).
BOOTSTRAP_START <- as.Date("1998-01-01")

fetch_series_incremental <- function(key_name, series_id) {
  cache_file <- file.path(CACHE_DIR, paste0(key_name, ".csv"))

  existing <- if (file.exists(cache_file)) {
    read_csv(cache_file, show_col_types = FALSE,
             col_types = cols(date = col_date(), value = col_double()))
  } else {
    tibble(date = as.Date(character()), value = numeric())
  }

  start_date <- if (nrow(existing) > 0) max(existing$date) + 1 else BOOTSTRAP_START
  end_date   <- Sys.Date()

  if (start_date > end_date) {
    message(sprintf("  [%s] cache up-to-date (latest %s)", key_name, max(existing$date)))
    return(existing)
  }

  message(sprintf("  [%s] fetching %s from %s to %s",
                  key_name, series_id, start_date, end_date))

  new_obs <- tryCatch(
    fredr(series_id = series_id,
          observation_start = start_date,
          observation_end   = end_date) |>
      select(date, value) |>
      filter(!is.na(value)),
    error = function(e) {
      warning(sprintf("FRED fetch failed for %s: %s", series_id, conditionMessage(e)),
              call. = FALSE)
      tibble(date = as.Date(character()), value = numeric())
    }
  )

  if (nrow(new_obs) == 0) {
    message(sprintf("  [%s] no new observations", key_name))
    return(existing)
  }

  merged <- bind_rows(existing, new_obs) |>
    distinct(date, .keep_all = TRUE) |>
    arrange(date)

  write_csv(merged, cache_file)
  message(sprintf("  [%s] wrote %d rows (+%d new) to %s",
                  key_name, nrow(merged), nrow(new_obs), basename(cache_file)))
  merged
}

fetch_all_fred <- function() {
  api_key <- Sys.getenv("FRED_API_KEY")
  if (!nzchar(api_key)) {
    stop("FRED_API_KEY not set. Cannot fetch live FRED data.", call. = FALSE)
  }
  fredr_set_key(api_key)
  message("Fetching FRED public-domain series incrementally...")
  imap(FRED_SERIES, \(id, key) fetch_series_incremental(key, id))
}
