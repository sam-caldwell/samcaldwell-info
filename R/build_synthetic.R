# -----------------------------------------------------------------------------
# build_synthetic.R
#
# Fully synthetic dataset generator. Used as a local-dev fallback when no
# FRED_API_KEY is present. Produces the same 5 CSVs as the FRED path.
#
# Historical figures (1999-2024) are hand-entered from public sources
# (BEA, BLS, Fed, NBER, published index aggregates) and may differ slightly
# from vintage-adjusted official values. 2025 and 2026 are illustrative.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(tibble)
})

build_synthetic <- function() {
  project_root <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
  out_dir <- file.path(project_root, "data", "economy")
  dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

  set.seed(20260419)

  annual <- tibble::tribble(
    ~year, ~gdp_growth, ~unemployment, ~cpi, ~fed_funds, ~ten_year, ~sp500_ret, ~dow_ret, ~nasdaq_ret, ~vix_avg, ~recession,
    1999,   4.8, 4.2, 2.2, 5.50, 6.0,  21.0,  25.2,  85.6, 24, 0,
    2000,   4.1, 4.0, 3.4, 6.50, 6.0,  -9.1,  -6.2, -39.3, 23, 0,
    2001,   1.0, 4.7, 2.8, 1.75, 5.0, -11.9,  -7.1, -21.1, 26, 1,
    2002,   1.7, 5.8, 1.6, 1.25, 4.6, -22.1, -16.8, -31.5, 27, 0,
    2003,   2.8, 6.0, 2.3, 1.00, 4.0,  28.7,  25.3,  50.0, 22, 0,
    2004,   3.9, 5.5, 2.7, 2.25, 4.3,  10.9,   3.1,   8.6, 15, 0,
    2005,   3.5, 5.1, 3.4, 4.25, 4.3,   4.9,  -0.6,   1.4, 13, 0,
    2006,   2.8, 4.6, 3.2, 5.25, 4.8,  15.8,  16.3,   9.5, 13, 0,
    2007,   2.0, 4.6, 2.9, 4.25, 4.6,   5.5,   6.4,   9.8, 18, 0,
    2008,   0.1, 5.8, 3.8, 0.25, 3.7, -37.0, -33.8, -40.5, 33, 1,
    2009,  -2.6, 9.3,-0.4, 0.25, 3.3,  26.5,  18.8,  43.9, 32, 1,
    2010,   2.7, 9.6, 1.6, 0.25, 3.2,  15.1,  11.0,  16.9, 23, 0,
    2011,   1.6, 8.9, 3.2, 0.25, 2.8,   2.1,   5.5,  -1.8, 24, 0,
    2012,   2.3, 8.1, 2.1, 0.25, 1.8,  16.0,   7.3,  15.9, 18, 0,
    2013,   2.1, 7.4, 1.5, 0.25, 2.4,  32.4,  26.5,  38.3, 14, 0,
    2014,   2.5, 6.2, 1.6, 0.25, 2.5,  13.7,   7.5,  13.4, 14, 0,
    2015,   2.9, 5.3, 0.1, 0.50, 2.1,   1.4,  -2.2,   5.7, 17, 0,
    2016,   1.8, 4.9, 1.3, 0.75, 1.8,  12.0,  13.4,   7.5, 16, 0,
    2017,   2.5, 4.4, 2.1, 1.50, 2.3,  21.8,  25.1,  28.2, 11, 0,
    2018,   3.0, 3.9, 2.4, 2.50, 2.9,  -4.4,  -5.6,  -3.9, 16, 0,
    2019,   2.6, 3.7, 1.8, 1.75, 2.1,  31.5,  22.3,  35.2, 15, 0,
    2020,  -2.2, 8.1, 1.2, 0.25, 0.9,  18.4,   7.2,  43.6, 29, 1,
    2021,   5.8, 5.4, 4.7, 0.25, 1.4,  28.7,  18.7,  21.4, 20, 0,
    2022,   1.9, 3.6, 8.0, 4.50, 3.0, -18.1,  -8.8, -33.1, 26, 0,
    2023,   2.5, 3.6, 4.1, 5.50, 4.0,  26.3,  13.7,  43.4, 17, 0,
    2024,   2.8, 4.0, 2.9, 4.50, 4.2,  25.0,  13.8,  29.6, 16, 0,
    2025,   2.1, 4.2, 2.8, 3.75, 4.3,  12.0,   8.5,  14.8, 18, 0,
    2026,   1.6, 4.5, 2.6, 3.25, 4.0,   4.0,   3.2,   5.1, 20, 0
  )
  annual$prototype <- as.integer(annual$year >= as.integer(format(Sys.Date(), "%Y")))
  write_csv(annual, file.path(out_dir, "annual.csv"))

  gdp_components <- annual %>%
    transmute(
      year,
      consumption = 68 + rnorm(n(), 0, 0.6),
      investment  = 18 + rnorm(n(), 0, 0.8) + ifelse(year %in% c(2008,2009,2020), -3, 0),
      government  = 18 + rnorm(n(), 0, 0.4) + ifelse(year %in% c(2020,2021), 1.5, 0),
      net_exports = -4 + rnorm(n(), 0, 0.5)
    ) %>%
    mutate(across(consumption:net_exports, \(x) round(x, 2)))
  write_csv(gdp_components, file.path(out_dir, "gdp_components.csv"))

  decompose_quarterly <- function(annual_vec, noise_sd = 0.3) {
    qtrs <- rep(annual_vec, each = 4)
    noise <- rnorm(length(qtrs), 0, noise_sd)
    grp <- rep(seq_along(annual_vec), each = 4)
    noise <- noise - ave(noise, grp)
    qtrs + noise
  }

  quarterly <- tibble(
    year    = rep(annual$year, each = 4),
    quarter = rep(1:4, times = nrow(annual)),
    date    = as.Date(sprintf("%d-%02d-01", rep(annual$year, each = 4),
                              rep(c(1,4,7,10), times = nrow(annual))))
  ) %>%
    mutate(
      period = sprintf("%dQ%d", year, quarter),
      gdp_growth    = decompose_quarterly(annual$gdp_growth,   0.6),
      unemployment  = decompose_quarterly(annual$unemployment, 0.25),
      cpi           = decompose_quarterly(annual$cpi,          0.35),
      fed_funds     = decompose_quarterly(annual$fed_funds,    0.15),
      ten_year      = decompose_quarterly(annual$ten_year,     0.20),
      sp500_ret_qoq = decompose_quarterly(annual$sp500_ret / 4, 3.5),
      vix           = decompose_quarterly(annual$vix_avg,      2.5)
    ) %>%
    mutate(across(gdp_growth:vix, \(x) round(x, 2))) %>%
    filter(as.Date(date) <= Sys.Date())
  write_csv(quarterly, file.path(out_dir, "quarterly.csv"))

  months_tbl <- tibble(
    year  = rep(annual$year, each = 12),
    month = rep(1:12, times = nrow(annual))
  ) %>% mutate(date = as.Date(sprintf("%d-%02d-01", year, month)))

  decompose_monthly <- function(annual_vec, noise_sd = 0.2) {
    mo <- rep(annual_vec, each = 12)
    noise <- rnorm(length(mo), 0, noise_sd)
    grp <- rep(seq_along(annual_vec), each = 12)
    noise <- noise - ave(noise, grp)
    mo + noise
  }

  monthly <- months_tbl %>%
    mutate(
      unemployment = decompose_monthly(annual$unemployment, 0.18),
      cpi          = decompose_monthly(annual$cpi,          0.25),
      fed_funds    = decompose_monthly(annual$fed_funds,    0.10),
      ten_year     = decompose_monthly(annual$ten_year,     0.15),
      .mret        = decompose_monthly(annual$sp500_ret / 12, 2.2),
      vix          = decompose_monthly(annual$vix_avg,      2.0)
    ) %>%
    mutate(sp500_level = round(1260 * cumprod(1 + .mret/100), 1)) %>%
    select(-.mret) %>%
    mutate(across(c(unemployment, cpi, fed_funds, ten_year, vix), \(x) round(x, 2))) %>%
    filter(date <= Sys.Date())
  write_csv(monthly, file.path(out_dir, "monthly.csv"))

  sectors <- c(
    "Information Technology","Health Care","Financials","Consumer Discretionary",
    "Communication Services","Industrials","Consumer Staples","Energy",
    "Utilities","Real Estate","Materials"
  )
  sector_beta <- c(1.35,0.85,1.20,1.15,1.10,1.05,0.70,1.30,0.55,0.90,1.05)
  names(sector_beta) <- sectors
  sector_returns <- bind_rows(lapply(sectors, function(s) {
    b <- sector_beta[[s]]
    tibble(year = annual$year, sector = s,
           return_pct = round(annual$sp500_ret * b + rnorm(nrow(annual), 0, 4), 1))
  }))
  write_csv(sector_returns, file.path(out_dir, "sectors.csv"))

  cat(sprintf("build_synthetic: wrote 5 CSVs to %s\n", out_dir))
  invisible(NULL)
}
