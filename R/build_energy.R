# -----------------------------------------------------------------------------
# build_energy.R
#
# Assembles the /energy/ analysis's CSVs from:
#   - FRED cache (data/economy/cache/<series>.csv): WTI, Brent, retail gas,
#     Henry Hub, US crude production/stocks, gas demand, electricity price
#   - EIA cache (data/energy/cache/<series>.csv):   PADD gasoline, STEO
#     monthly forecasts, international prices
#   - Curated events (data/energy/events_energy.csv)
#
# Outputs under data/energy/:
#   us_prices_daily.csv        — Date, WTI, Brent, natgas, retail_gas (latest daily)
#   us_supply_demand.csv       — Date, us_crude_prod, us_crude_stocks, us_gas_demand
#   padd_gas_current.csv       — 5 rows (1 per PADD): area, latest price, prior-week
#   padd_gas_10y.csv           — 5 rows: area, price_now, price_10y_ago, pct_change
#   intl_prices.csv            — long: country, period, product, price
#   steo_forecast.csv          — long: date, series_id, value, series_label
#   energy_summary.csv         — headline numbers for the overview page
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(tibble)
  library(lubridate)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
FRED_CACHE   <- file.path(PROJECT_ROOT, "data", "economy", "cache")
ENERGY_DIR   <- file.path(PROJECT_ROOT, "data", "energy")
ENERGY_CACHE <- file.path(ENERGY_DIR, "cache")
dir.create(ENERGY_DIR, recursive = TRUE, showWarnings = FALSE)

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

read_fred <- function(name) {
  p <- file.path(FRED_CACHE, paste0(name, ".csv"))
  if (!file.exists(p) || file.size(p) == 0) return(tibble(date = as.Date(character()), value = numeric()))
  read_csv(p, show_col_types = FALSE,
           col_types = cols(date = col_date(), value = col_double()))
}

read_eia_cache <- function(name) {
  p <- file.path(ENERGY_CACHE, paste0(name, ".csv"))
  if (!file.exists(p) || file.size(p) == 0) {
    return(tibble(period = character(), value = numeric(),
                  series_id = character(), duoarea = character(),
                  area_name = character(), product = character()))
  }
  read_csv(p, show_col_types = FALSE,
           col_types = cols(.default = "c", value = "d"))
}

build_energy <- function() {
  # --- US daily prices (join on date where frequencies align) ---------------
  wti    <- read_fred("wti")              |> rename(wti = value)
  brent  <- read_fred("brent")            |> rename(brent = value)
  natgas <- read_fred("natgas_henry_hub") |> rename(natgas = value)
  gas    <- read_fred("gas_retail_us")    |> rename(retail_gas = value)
  elec   <- read_fred("elec_retail_us")   |> rename(electricity = value)

  us_prices <- reduce_full_join(list(wti, brent, natgas), by = "date") |>
    arrange(date)
  write_csv(us_prices, file.path(ENERGY_DIR, "us_prices_daily.csv"))

  gas_retail <- gas |> arrange(date)
  write_csv(gas_retail, file.path(ENERGY_DIR, "us_gas_retail_weekly.csv"))

  elec_monthly <- elec |> arrange(date)
  write_csv(elec_monthly, file.path(ENERGY_DIR, "us_electricity_monthly.csv"))

  # --- US supply/demand ----------------------------------------------------
  # FRED weekly supply/demand series (WCRFPUS2 etc.) were retired. Needs to
  # be re-plumbed via the EIA petroleum/sup and petroleum/stoc endpoints.
  # For now write an empty frame with the expected schema so the page
  # renders its "pending" note.
  write_csv(tibble(date = as.Date(character()),
                   us_crude_prod = numeric(),
                   us_crude_stocks = numeric(),
                   us_gas_demand = numeric()),
            file.path(ENERGY_DIR, "us_supply_demand.csv"))

  # --- PADD gasoline (from EIA cache) --------------------------------------
  padd_raw <- read_eia_cache("padd_gasoline_weekly")
  padd <- if (nrow(padd_raw) > 0) {
    padd_raw |>
      mutate(date = suppressWarnings(as.Date(period)),
             value = as.numeric(value)) |>
      filter(!is.na(date), !is.na(value)) |>
      select(date, duoarea, area_name, product, value)
  } else {
    tibble(date = as.Date(character()), duoarea = character(),
           area_name = character(), product = character(), value = numeric())
  }
  write_csv(padd, file.path(ENERGY_DIR, "padd_gasoline_weekly.csv"))

  if (nrow(padd) > 0) {
    latest_date <- max(padd$date)
    prior_week  <- latest_date - 7
    ten_years_ago <- latest_date - (365.25 * 10)

    current <- padd |>
      filter(date == latest_date) |>
      group_by(duoarea, area_name) |>
      summarize(price_now = mean(value, na.rm = TRUE), .groups = "drop")

    # Nearest prior-week price per PADD
    prior <- padd |>
      mutate(abs_diff = as.numeric(abs(date - prior_week))) |>
      arrange(abs_diff) |>
      group_by(duoarea) |>
      slice(1) |>
      ungroup() |>
      select(duoarea, price_prior = value)

    ten <- padd |>
      mutate(abs_diff = as.numeric(abs(date - ten_years_ago))) |>
      arrange(abs_diff) |>
      group_by(duoarea) |>
      slice(1) |>
      ungroup() |>
      select(duoarea, price_10y_ago = value, date_10y_ago = date)

    padd_current <- current |>
      left_join(prior, by = "duoarea") |>
      mutate(wow_change = round(price_now - price_prior, 3))
    write_csv(padd_current, file.path(ENERGY_DIR, "padd_gas_current.csv"))

    padd_10y <- current |>
      left_join(ten, by = "duoarea") |>
      mutate(
        pct_change_10y = round(100 * (price_now - price_10y_ago) / price_10y_ago, 1),
        abs_change_10y = round(price_now - price_10y_ago, 3)
      )
    write_csv(padd_10y, file.path(ENERGY_DIR, "padd_gas_10y.csv"))
  } else {
    # Empty placeholders so downstream pages render with a "no data yet" state
    write_csv(tibble(duoarea = character(), area_name = character(),
                     price_now = numeric(), price_prior = numeric(),
                     wow_change = numeric()),
              file.path(ENERGY_DIR, "padd_gas_current.csv"))
    write_csv(tibble(duoarea = character(), area_name = character(),
                     price_now = numeric(), price_10y_ago = numeric(),
                     pct_change_10y = numeric(), abs_change_10y = numeric(),
                     date_10y_ago = as.Date(character())),
              file.path(ENERGY_DIR, "padd_gas_10y.csv"))
  }

  # --- International prices ------------------------------------------------
  intl_raw <- read_eia_cache("intl_gasoline_monthly")
  intl <- if (nrow(intl_raw) > 0) {
    intl_raw |>
      mutate(period_date = suppressWarnings(as.Date(paste0(period, "-01"))),
             value = as.numeric(value)) |>
      filter(!is.na(period_date), !is.na(value)) |>
      select(country = duoarea, country_name = area_name,
             period = period_date, product, value)
  } else {
    tibble(country = character(), country_name = character(),
           period = as.Date(character()),
           product = character(), value = numeric())
  }
  write_csv(intl, file.path(ENERGY_DIR, "intl_prices.csv"))

  # --- STEO forecast -------------------------------------------------------
  steo_raw <- read_eia_cache("steo_monthly")
  steo <- if (nrow(steo_raw) > 0) {
    steo_raw |>
      mutate(period_date = suppressWarnings(as.Date(paste0(period, "-01"))),
             value = as.numeric(value)) |>
      filter(!is.na(period_date), !is.na(value)) |>
      select(date = period_date, series_id, value)
  } else {
    tibble(date = as.Date(character()), series_id = character(),
           value = numeric())
  }
  write_csv(steo, file.path(ENERGY_DIR, "steo_forecast.csv"))

  # --- Summary -------------------------------------------------------------
  latest_wti    <- tail(wti$wti,    1) %||% NA_real_
  latest_brent  <- tail(brent$brent, 1) %||% NA_real_
  latest_gas    <- tail(gas$retail_gas, 1) %||% NA_real_
  latest_natgas <- tail(natgas$natgas, 1) %||% NA_real_
  # `prod` was removed when the retired FRED supply/demand series were dropped.
  # Keep the summary column so the Overview page's card doesn't break — report NA.
  latest_prod   <- NA_real_

  summary_tbl <- tibble(
    as_of              = Sys.Date(),
    wti_spot           = round(latest_wti, 2),
    brent_spot         = round(latest_brent, 2),
    us_retail_gasoline = round(latest_gas, 3),
    henry_hub_natgas   = round(latest_natgas, 3),
    us_crude_production_mbd = round(latest_prod / 1000, 2),  # thousand-bbl/day → mbd
    padd_coverage      = nrow(padd) > 0,
    intl_coverage      = nrow(intl) > 0,
    steo_coverage      = nrow(steo) > 0
  )
  write_csv(summary_tbl, file.path(ENERGY_DIR, "energy_summary.csv"))

  cat(sprintf("build_energy: WTI=%.2f, Brent=%.2f, gas=%.3f, natgas=%.3f; PADD=%s, INTL=%s, STEO=%s\n",
              latest_wti, latest_brent, latest_gas, latest_natgas,
              summary_tbl$padd_coverage, summary_tbl$intl_coverage, summary_tbl$steo_coverage))
  invisible(NULL)
}

reduce_full_join <- function(tbl_list, by) {
  if (length(tbl_list) == 0) return(tibble())
  acc <- tbl_list[[1]]
  for (i in seq_along(tbl_list)[-1]) {
    acc <- full_join(acc, tbl_list[[i]], by = by)
  }
  acc
}
