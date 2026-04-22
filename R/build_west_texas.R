# -----------------------------------------------------------------------------
# build_west_texas.R
#
# Assembles West Texas regional analysis CSVs from:
#   * BLS LAUS county unemployment caches  (data/west-texas/cache/bls_laus_*.csv)
#   * BEA income + GDP caches              (data/west-texas/cache/bea_*.csv)
#   * FRED national + TX state caches      (data/economy/cache/unemployment.csv,
#                                            tx_unemployment.csv)
#
# Outputs (data/west-texas/):
#   * unemployment_monthly.csv  — date, geo, geo_label, unemployment_rate
#   * income_annual.csv         — year, geo, geo_label, per_capita_income
#   * gdp_annual.csv            — year, geo, geo_label, gdp, gdp_growth_pct
#   * west_texas_summary.csv    — latest values for overview page cards
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
WT_CACHE     <- file.path(PROJECT_ROOT, "data", "west-texas", "cache")
WT_OUT       <- file.path(PROJECT_ROOT, "data", "west-texas")
FRED_CACHE   <- file.path(PROJECT_ROOT, "data", "economy", "cache")
dir.create(WT_OUT, recursive = TRUE, showWarnings = FALSE)

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

read_csv_safe <- function(path, ...) {
  if (!file.exists(path) || file.size(path) == 0)
    return(tibble())
  suppressWarnings(read_csv(path, show_col_types = FALSE, ...))
}

GEO_LABELS <- c(
  sutton     = "Sutton Co. (Sonora)",
  schleicher = "Schleicher Co. (Eldorado)",
  crockett   = "Crockett Co. (Ozona)",
  kimble     = "Kimble Co. (Junction)",
  TX         = "Texas",
  US         = "United States"
)

# ---- Build unemployment_monthly.csv ----------------------------------------

build_unemployment <- function() {
  # County data from BLS LAUS caches
  counties <- c("sutton", "schleicher", "crockett", "kimble")
  county_dfs <- lapply(counties, function(cty) {
    df <- read_csv_safe(file.path(WT_CACHE, paste0("bls_laus_", cty, "_ur.csv")))
    if (nrow(df) == 0) return(tibble(date = as.Date(character()),
                                      geo = character(),
                                      geo_label = character(),
                                      unemployment_rate = numeric()))
    df |>
      transmute(date, geo = cty, geo_label = GEO_LABELS[cty],
                unemployment_rate = value)
  })

  # US national (FRED UNRATE)
  us <- read_csv_safe(file.path(FRED_CACHE, "unemployment.csv")) |>
    transmute(date, geo = "US", geo_label = "United States",
              unemployment_rate = value)

  # Texas state (FRED TXUR)
  tx <- read_csv_safe(file.path(FRED_CACHE, "tx_unemployment.csv")) |>
    transmute(date, geo = "TX", geo_label = "Texas",
              unemployment_rate = value)

  combined <- bind_rows(county_dfs) |>
    bind_rows(us) |>
    bind_rows(tx) |>
    filter(!is.na(unemployment_rate)) |>
    arrange(date, geo)

  write_csv(combined, file.path(WT_OUT, "unemployment_monthly.csv"))
  message(sprintf("build_west_texas: unemployment_monthly.csv — %d rows (%d geos)",
                  nrow(combined), n_distinct(combined$geo)))
  combined
}

# ---- Build income_annual.csv -----------------------------------------------

build_income <- function() {
  income <- read_csv_safe(file.path(WT_CACHE, "bea_income.csv"))
  if (nrow(income) == 0) {
    # Write schema-only file
    write_csv(tibble(year = integer(), geo = character(),
                     geo_label = character(), per_capita_income = numeric()),
              file.path(WT_OUT, "income_annual.csv"))
    message("build_west_texas: income_annual.csv — 0 rows (no BEA data)")
    return(tibble())
  }

  write_csv(income, file.path(WT_OUT, "income_annual.csv"))
  message(sprintf("build_west_texas: income_annual.csv — %d rows (%d–%d)",
                  nrow(income), min(income$year), max(income$year)))
  income
}

# ---- Build gdp_annual.csv -------------------------------------------------

build_gdp <- function() {
  gdp <- read_csv_safe(file.path(WT_CACHE, "bea_gdp.csv"))
  if (nrow(gdp) == 0) {
    write_csv(tibble(year = integer(), geo = character(),
                     geo_label = character(), gdp = numeric(),
                     gdp_growth_pct = numeric()),
              file.path(WT_OUT, "gdp_annual.csv"))
    message("build_west_texas: gdp_annual.csv — 0 rows (no BEA data)")
    return(tibble())
  }

  # Compute YoY growth per geo
  gdp_out <- gdp |>
    arrange(geo, year) |>
    group_by(geo) |>
    mutate(gdp_growth_pct = round((gdp / lag(gdp) - 1) * 100, 2)) |>
    ungroup()

  write_csv(gdp_out, file.path(WT_OUT, "gdp_annual.csv"))
  message(sprintf("build_west_texas: gdp_annual.csv — %d rows (%d–%d)",
                  nrow(gdp_out), min(gdp_out$year), max(gdp_out$year)))
  gdp_out
}

# ---- Build west_texas_summary.csv ------------------------------------------

build_summary <- function(unemp, income, gdp) {
  latest_ur <- function(g) {
    x <- unemp |> filter(.data$geo == g)
    if (nrow(x) == 0) return(NA_real_)
    x <- x |> filter(.data$date == max(.data$date))
    x$unemployment_rate[1]
  }

  latest_income <- function(g) {
    if (nrow(income) == 0) return(NA_real_)
    x <- income |> filter(.data$geo == g)
    if (nrow(x) == 0) return(NA_real_)
    x <- x |> filter(.data$year == max(.data$year))
    x$per_capita_income[1]
  }

  county_urs <- c(latest_ur("sutton"), latest_ur("schleicher"),
                  latest_ur("crockett"), latest_ur("kimble"))
  regional_avg_ur <- mean(county_urs, na.rm = TRUE)

  county_incomes <- c(latest_income("sutton"), latest_income("schleicher"),
                      latest_income("crockett"), latest_income("kimble"))
  regional_avg_income <- mean(county_incomes, na.rm = TRUE)

  summary_tbl <- tibble(
    as_of              = Sys.Date(),
    us_ur              = latest_ur("US"),
    tx_ur              = latest_ur("TX"),
    sutton_ur          = latest_ur("sutton"),
    schleicher_ur      = latest_ur("schleicher"),
    crockett_ur        = latest_ur("crockett"),
    kimble_ur          = latest_ur("kimble"),
    regional_avg_ur    = round(regional_avg_ur, 1),
    us_income          = latest_income("US"),
    tx_income          = latest_income("TX"),
    sutton_income      = latest_income("sutton"),
    schleicher_income  = latest_income("schleicher"),
    crockett_income    = latest_income("crockett"),
    kimble_income      = latest_income("kimble"),
    regional_avg_income = round(regional_avg_income, 0)
  )

  write_csv(summary_tbl, file.path(WT_OUT, "west_texas_summary.csv"))
  message(sprintf("build_west_texas: summary — US UR=%.1f%%, TX UR=%.1f%%, regional avg UR=%.1f%%",
                  summary_tbl$us_ur %||% NA, summary_tbl$tx_ur %||% NA,
                  summary_tbl$regional_avg_ur %||% NA))
  summary_tbl
}

# ---- Orchestrator ----------------------------------------------------------

build_west_texas <- function() {
  unemp  <- build_unemployment()
  income <- build_income()
  gdp    <- build_gdp()
  build_summary(unemp, income, gdp)
  invisible(NULL)
}
