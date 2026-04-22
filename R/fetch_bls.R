# -----------------------------------------------------------------------------
# fetch_bls.R
#
# Incremental BLS LAUS (Local Area Unemployment Statistics) fetcher for the
# four West Texas counties:
#   * Sutton County     (Sonora)     — FIPS 48435
#   * Schleicher County (Eldorado)   — FIPS 48413
#   * Crockett County   (Ozona)      — FIPS 48105
#   * Kimble County     (Junction)   — FIPS 48267
#
# Auth: BLS_API_KEY from environment. Register free at
#       https://data.bls.gov/registrationEngine/
# License: BLS data are public domain (US government work).
#
# Incremental caching: each series is cached to data/west-texas/cache/<key>.csv
# and only observations after the latest cached date are kept from new fetches.
# BLS API v2 returns up to 20 years of data per call.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(httr2)
  library(jsonlite)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
WT_CACHE     <- file.path(PROJECT_ROOT, "data", "west-texas", "cache")
dir.create(WT_CACHE, recursive = TRUE, showWarnings = FALSE)

# LAUS series ID format: LAUCN<FIPS5>0000000003 = unemployment rate (%)
#                         LAUCN<FIPS5>0000000006 = labor force
BLS_LAUS_SERIES <- list(
  sutton_ur      = "LAUCN484350000000003",
  schleicher_ur  = "LAUCN484130000000003",
  crockett_ur    = "LAUCN481050000000003",
  kimble_ur      = "LAUCN482670000000003"
)

BLS_BASE <- "https://api.bls.gov/publicAPI/v2/timeseries/data/"

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

# ---- Fetch a batch of BLS series for a year range --------------------------

bls_fetch_batch <- function(series_ids, start_year, end_year) {
  api_key <- Sys.getenv("BLS_API_KEY")

  body <- list(
    seriesid  = series_ids,
    startyear = as.character(start_year),
    endyear   = as.character(end_year)
  )

  # Include registration key if available (raises rate limits from 25 to 500/day)
  if (nzchar(api_key)) body$registrationkey <- api_key

  resp <- request(BLS_BASE) |>
    req_body_json(body) |>
    req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
    req_timeout(60) |>
    req_retry(max_tries = 3, backoff = \(n) 5 * n) |>
    req_perform()

  parsed <- resp_body_json(resp)

  if (parsed$status != "REQUEST_SUCCEEDED") {
    stop("BLS API error: ", paste(parsed$message, collapse = "; "), call. = FALSE)
  }

  parsed$Results$series
}

# ---- Parse BLS series data into a tibble -----------------------------------

parse_bls_series <- function(series_data) {
  if (length(series_data$data) == 0) return(tibble(date = as.Date(character()), value = numeric()))

  rows <- lapply(series_data$data, function(obs) {
    # period is "M01"–"M12" for monthly; skip "M13" (annual average)
    if (obs$period == "M13") return(NULL)
    month <- as.integer(sub("^M", "", obs$period))
    tibble(
      date  = as.Date(sprintf("%s-%02d-01", obs$year, month)),
      value = as.numeric(obs$value)
    )
  })

  bind_rows(rows) |> filter(!is.na(value)) |> arrange(date)
}

# ---- Incremental fetch for a single series ---------------------------------

fetch_bls_series <- function(key_name, series_id) {
  cache_file <- file.path(WT_CACHE, paste0("bls_laus_", key_name, ".csv"))

  existing <- if (file.exists(cache_file) && file.size(cache_file) > 0) {
    read_csv(cache_file, show_col_types = FALSE,
             col_types = cols(date = col_date(), value = col_double()))
  } else {
    tibble(date = as.Date(character()), value = numeric())
  }

  # BLS API allows 20-year windows. Fetch from year after latest cache.
  start_year <- if (nrow(existing) > 0) {
    as.integer(format(max(existing$date), "%Y"))
  } else {
    2005L
  }
  end_year <- as.integer(format(Sys.Date(), "%Y"))

  if (start_year > end_year) {
    message(sprintf("  [bls_%s] cache up-to-date (latest %s)", key_name, max(existing$date)))
    return(existing)
  }

  message(sprintf("  [bls_%s] fetching %s from %d to %d",
                  key_name, series_id, start_year, end_year))

  series_list <- tryCatch(
    bls_fetch_batch(list(series_id), start_year, end_year),
    error = function(e) {
      warning(sprintf("BLS fetch failed for %s: %s", series_id, conditionMessage(e)),
              call. = FALSE)
      return(NULL)
    }
  )

  if (is.null(series_list) || length(series_list) == 0) {
    message(sprintf("  [bls_%s] no data returned", key_name))
    return(existing)
  }

  new_obs <- parse_bls_series(series_list[[1]])

  if (nrow(new_obs) == 0) {
    message(sprintf("  [bls_%s] no new observations", key_name))
    return(existing)
  }

  merged <- bind_rows(existing, new_obs) |>
    distinct(date, .keep_all = TRUE) |>
    arrange(date)

  write_csv(merged, cache_file)
  message(sprintf("  [bls_%s] wrote %d rows to %s",
                  key_name, nrow(merged), basename(cache_file)))
  merged
}

# ---- Orchestrator ----------------------------------------------------------

fetch_bls_all <- function() {
  message("Fetching BLS LAUS county unemployment data")

  api_key <- Sys.getenv("BLS_API_KEY")
  if (!nzchar(api_key)) {
    message("  BLS_API_KEY not set; using unauthenticated access (25 req/day limit)")
  }

  for (key in names(BLS_LAUS_SERIES)) {
    tryCatch(
      fetch_bls_series(key, BLS_LAUS_SERIES[[key]]),
      error = function(e) warning(sprintf("BLS %s failed: %s", key, conditionMessage(e)),
                                  call. = FALSE)
    )
    Sys.sleep(1)  # rate-limit courtesy
  }

  invisible(NULL)
}
