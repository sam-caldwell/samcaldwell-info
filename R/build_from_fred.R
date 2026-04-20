# -----------------------------------------------------------------------------
# build_from_fred.R
#
# Transforms the FRED cache (data/cache/*.csv) plus the synthetic market
# overlay into the five output CSVs the site consumes:
#   data/annual.csv, data/quarterly.csv, data/monthly.csv,
#   data/gdp_components.csv, data/sectors.csv
#
# Macro columns (gdp_growth, unemployment, cpi, fed_funds, ten_year,
# recession, and GDP components) come from FRED. Market columns (sp500_ret,
# dow_ret, nasdaq_ret, vix_avg, vix, sp500_level, sector returns) come from
# the synthetic overlay — FRED's proprietary market licenses prohibit
# redistribution of the raw series.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(purrr)
  library(lubridate)
  library(tibble)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
DATA_OUT     <- file.path(PROJECT_ROOT, "data")
dir.create(DATA_OUT, showWarnings = FALSE, recursive = TRUE)

# ---- Helpers ----------------------------------------------------------------

annual_mean  <- function(series) series |> mutate(year = year(date)) |>
  group_by(year) |> summarize(value = mean(value, na.rm = TRUE), .groups = "drop")

annual_end   <- function(series) series |> mutate(year = year(date)) |>
  group_by(year) |> slice_tail(n = 1) |> ungroup() |> select(year, value)

annual_max   <- function(series) series |> mutate(year = year(date)) |>
  group_by(year) |> summarize(value = max(value, na.rm = TRUE), .groups = "drop")

# YoY % change of a quarterly series (GDPC1): current Q / same Q last year - 1
yoy_quarterly <- function(series) {
  s <- series |> arrange(date)
  s$lag4 <- dplyr::lag(s$value, 4)
  s |> mutate(yoy = (value / lag4 - 1) * 100) |> select(date, yoy)
}

# YoY % change of a monthly series (CPIAUCSL): m vs 12 months prior
yoy_monthly <- function(series) {
  s <- series |> arrange(date)
  s$lag12 <- dplyr::lag(s$value, 12)
  s |> mutate(yoy = (value / lag12 - 1) * 100) |> select(date, yoy)
}

# ---- Synthetic market overlay (not redistributable from FRED) ---------------

synthetic_markets <- tibble::tribble(
  ~year, ~sp500_ret, ~dow_ret, ~nasdaq_ret, ~vix_avg,
  2000,   -9.1,   -6.2, -39.3, 23,
  2001,  -11.9,   -7.1, -21.1, 26,
  2002,  -22.1,  -16.8, -31.5, 27,
  2003,   28.7,   25.3,  50.0, 22,
  2004,   10.9,    3.1,   8.6, 15,
  2005,    4.9,   -0.6,   1.4, 13,
  2006,   15.8,   16.3,   9.5, 13,
  2007,    5.5,    6.4,   9.8, 18,
  2008,  -37.0,  -33.8, -40.5, 33,
  2009,   26.5,   18.8,  43.9, 32,
  2010,   15.1,   11.0,  16.9, 23,
  2011,    2.1,    5.5,  -1.8, 24,
  2012,   16.0,    7.3,  15.9, 18,
  2013,   32.4,   26.5,  38.3, 14,
  2014,   13.7,    7.5,  13.4, 14,
  2015,    1.4,   -2.2,   5.7, 17,
  2016,   12.0,   13.4,   7.5, 16,
  2017,   21.8,   25.1,  28.2, 11,
  2018,   -4.4,   -5.6,  -3.9, 16,
  2019,   31.5,   22.3,  35.2, 15,
  2020,   18.4,    7.2,  43.6, 29,
  2021,   28.7,   18.7,  21.4, 20,
  2022,  -18.1,   -8.8, -33.1, 26,
  2023,   26.3,   13.7,  43.4, 17,
  2024,   25.0,   13.8,  29.6, 16,
  2025,   12.0,    8.5,  14.8, 18,
  2026,    4.0,    3.2,   5.1, 20
)

# ---- Annual assembly --------------------------------------------------------

build_annual <- function(cache, current_year) {
  years_covered <- 2000:current_year

  gdp_yoy_q <- yoy_quarterly(cache$gdp_real) |>
    mutate(year = year(date)) |>
    filter(!is.na(yoy))
  gdp_annual <- gdp_yoy_q |> group_by(year) |>
    summarize(gdp_growth = round(mean(yoy, na.rm = TRUE), 2), .groups = "drop")

  unrate_annual <- annual_mean(cache$unemployment) |>
    rename(unemployment = value) |> mutate(unemployment = round(unemployment, 2))

  cpi_yoy_m <- yoy_monthly(cache$cpi) |>
    mutate(year = year(date)) |>
    filter(!is.na(yoy))
  cpi_annual <- cpi_yoy_m |> group_by(year) |>
    summarize(cpi = round(mean(yoy, na.rm = TRUE), 2), .groups = "drop")

  ff_annual <- annual_end(cache$fed_funds) |>
    rename(fed_funds = value) |> mutate(fed_funds = round(fed_funds, 2))

  t10_annual <- annual_mean(cache$ten_year) |>
    rename(ten_year = value) |> mutate(ten_year = round(ten_year, 2))

  rec_annual <- annual_max(cache$recession) |>
    rename(recession = value) |> mutate(recession = as.integer(recession >= 1))

  tibble(year = years_covered) |>
    left_join(gdp_annual,    by = "year") |>
    left_join(unrate_annual, by = "year") |>
    left_join(cpi_annual,    by = "year") |>
    left_join(ff_annual,     by = "year") |>
    left_join(t10_annual,    by = "year") |>
    left_join(rec_annual,    by = "year") |>
    left_join(synthetic_markets, by = "year") |>
    mutate(
      recession = ifelse(is.na(recession), 0L, recession),
      prototype = as.integer(year >= current_year)
    )
}

# ---- GDP components (shares of nominal GDP) ---------------------------------

build_gdp_components <- function(cache, current_year) {
  assemble <- function(series) {
    series |> mutate(year = year(date)) |> group_by(year) |>
      summarize(value = mean(value, na.rm = TRUE), .groups = "drop")
  }
  gdp <- assemble(cache$gdp_nominal) |> rename(gdp = value)
  pce <- assemble(cache$pce) |> rename(c_ = value)
  inv <- assemble(cache$investment) |> rename(i_ = value)
  gov <- assemble(cache$government) |> rename(g_ = value)
  nx  <- assemble(cache$net_exports) |> rename(nx_ = value)

  tibble(year = 2000:current_year) |>
    left_join(gdp, by = "year") |>
    left_join(pce, by = "year") |>
    left_join(inv, by = "year") |>
    left_join(gov, by = "year") |>
    left_join(nx,  by = "year") |>
    mutate(
      consumption = round(100 * c_ / gdp, 2),
      investment  = round(100 * i_ / gdp, 2),
      government  = round(100 * g_ / gdp, 2),
      net_exports = round(100 * nx_ / gdp, 2)
    ) |>
    select(year, consumption, investment, government, net_exports)
}

# ---- Quarterly assembly -----------------------------------------------------

build_quarterly <- function(cache, annual_df, current_year, current_quarter) {
  set.seed(19991231)  # deterministic synthetic market noise (no daily drift)
  gdp_q <- yoy_quarterly(cache$gdp_real) |>
    mutate(year = year(date), quarter = quarter(date)) |>
    rename(gdp_growth = yoy)

  quarter_frame <- expand_grid(year = 2000:current_year, quarter = 1:4) |>
    mutate(date = as.Date(sprintf("%d-%02d-01", year, (quarter - 1) * 3 + 1))) |>
    filter(!(year == current_year & quarter > current_quarter))

  q_mean <- function(series) {
    series |> mutate(year = year(date), quarter = quarter(date)) |>
      group_by(year, quarter) |>
      summarize(value = mean(value, na.rm = TRUE), .groups = "drop")
  }

  unemp_q <- q_mean(cache$unemployment) |> rename(unemployment = value)
  cpi_q   <- yoy_monthly(cache$cpi) |>
    mutate(year = year(date), quarter = quarter(date)) |>
    group_by(year, quarter) |>
    summarize(cpi = mean(yoy, na.rm = TRUE), .groups = "drop")
  ff_q    <- q_mean(cache$fed_funds) |> rename(fed_funds = value)
  t10_q   <- q_mean(cache$ten_year)  |> rename(ten_year = value)

  quarter_frame |>
    left_join(gdp_q |> select(year, quarter, gdp_growth), by = c("year","quarter")) |>
    left_join(unemp_q, by = c("year","quarter")) |>
    left_join(cpi_q,   by = c("year","quarter")) |>
    left_join(ff_q,    by = c("year","quarter")) |>
    left_join(t10_q,   by = c("year","quarter")) |>
    mutate(
      period = sprintf("%dQ%d", year, quarter),
      # Quarterly synthetic S&P and VIX (derived from annual synthetic) + VIX
      sp500_ret_qoq = NA_real_,  # leave NA — computed below
      vix = NA_real_
    ) |>
    # derive quarterly market proxies from synthetic annual (even split + noise)
    left_join(synthetic_markets |> select(year, sp500_ret, vix_avg), by = "year") |>
    mutate(
      sp500_ret_qoq = round(sp500_ret / 4 + stats::rnorm(n(), 0, 2), 2),
      vix           = round(vix_avg   + stats::rnorm(n(), 0, 2), 2)
    ) |>
    select(-sp500_ret, -vix_avg) |>
    mutate(across(c(gdp_growth, unemployment, cpi, fed_funds, ten_year),
                  \(x) round(x, 2))) |>
    select(year, quarter, date, period,
           gdp_growth, unemployment, cpi, fed_funds, ten_year,
           sp500_ret_qoq, vix)
}

# ---- Monthly assembly -------------------------------------------------------

build_monthly <- function(cache, current_year) {
  set.seed(20000101)  # deterministic synthetic monthly market overlay
  month_frame <- expand_grid(year = 2000:current_year, month = 1:12) |>
    mutate(date = as.Date(sprintf("%d-%02d-01", year, month))) |>
    filter(date <= Sys.Date())

  m_mean <- function(series) {
    series |> mutate(year = year(date), month = month(date)) |>
      group_by(year, month) |>
      summarize(value = mean(value, na.rm = TRUE), .groups = "drop")
  }

  unemp_m <- cache$unemployment |>
    mutate(year = year(date), month = month(date)) |>
    select(year, month, unemployment = value)
  cpi_m   <- yoy_monthly(cache$cpi) |>
    mutate(year = year(date), month = month(date)) |>
    select(year, month, cpi = yoy)
  ff_m    <- cache$fed_funds |>
    mutate(year = year(date), month = month(date)) |>
    select(year, month, fed_funds = value)
  t10_m   <- m_mean(cache$ten_year) |> rename(ten_year = value)

  out <- month_frame |>
    left_join(unemp_m, by = c("year","month")) |>
    left_join(cpi_m,   by = c("year","month")) |>
    left_join(ff_m,    by = c("year","month")) |>
    left_join(t10_m,   by = c("year","month")) |>
    left_join(synthetic_markets |> select(year, sp500_ret, vix_avg), by = "year") |>
    arrange(date)

  out <- out |>
    mutate(
      .mret = round(sp500_ret / 12 + stats::rnorm(n(), 0, 1.8), 4),
      vix   = round(vix_avg + stats::rnorm(n(), 0, 1.6), 2)
    )
  out$sp500_level <- 1425 * cumprod(1 + out$.mret / 100)
  out$sp500_level <- round(out$sp500_level, 1)
  out |>
    mutate(across(c(unemployment, cpi, fed_funds, ten_year),
                  \(x) round(x, 2))) |>
    select(year, month, date, unemployment, cpi, fed_funds, ten_year,
           vix, sp500_level)
}

# ---- Sectors (synthetic) ----------------------------------------------------

build_sectors <- function(current_year) {
  sectors <- c(
    "Information Technology", "Health Care", "Financials", "Consumer Discretionary",
    "Communication Services", "Industrials", "Consumer Staples", "Energy",
    "Utilities", "Real Estate", "Materials"
  )
  sector_beta <- c(1.35, 0.85, 1.20, 1.15, 1.10, 1.05, 0.70, 1.30, 0.55, 0.90, 1.05)
  names(sector_beta) <- sectors
  set.seed(20000101)

  sm <- synthetic_markets |> filter(year <= current_year)
  bind_rows(lapply(sectors, function(s) {
    b <- sector_beta[[s]]
    tibble(
      year = sm$year,
      sector = s,
      return_pct = round(sm$sp500_ret * b + stats::rnorm(nrow(sm), 0, 4), 1)
    )
  }))
}

# ---- Orchestrator -----------------------------------------------------------

build_all_from_fred <- function() {
  source(file.path(PROJECT_ROOT, "R", "fetch_fred.R"), chdir = FALSE)
  cache <- fetch_all_fred()

  today          <- Sys.Date()
  current_year   <- lubridate::year(today)
  current_qtr    <- lubridate::quarter(today)

  annual_df    <- build_annual(cache, current_year)
  components_df <- build_gdp_components(cache, current_year)
  quarterly_df <- build_quarterly(cache, annual_df, current_year, current_qtr)
  monthly_df   <- build_monthly(cache, current_year)
  sectors_df   <- build_sectors(current_year)

  write_csv(annual_df,     file.path(DATA_OUT, "annual.csv"))
  write_csv(components_df, file.path(DATA_OUT, "gdp_components.csv"))
  write_csv(quarterly_df,  file.path(DATA_OUT, "quarterly.csv"))
  write_csv(monthly_df,    file.path(DATA_OUT, "monthly.csv"))
  write_csv(sectors_df,    file.path(DATA_OUT, "sectors.csv"))

  cat(sprintf("build_from_fred: wrote 5 CSVs covering 2000–%d\n", current_year))
  invisible(NULL)
}
