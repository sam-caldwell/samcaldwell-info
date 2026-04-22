# -----------------------------------------------------------------------------
# fetch_bea.R
#
# BEA (Bureau of Economic Analysis) fetcher for county-level data:
#   * CAINC1 — per-capita personal income (annual, all counties + TX + US)
#   * CAGDP1 — county GDP (annual, all counties + TX + US)
#
# Counties:
#   * Sutton County     (Sonora)     — FIPS 48435
#   * Schleicher County (Eldorado)   — FIPS 48413
#   * Crockett County   (Ozona)      — FIPS 48105
#   * Kimble County     (Junction)   — FIPS 48267
#
# Auth: BEA_API_KEY from environment. Register free at
#       https://apps.bea.gov/api/signup/
# License: BEA data are public domain (US government work).
#
# Caching: full-replace per dataset (BEA API returns all years in one call).
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(httr2)
  library(jsonlite)
  library(tidyr)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
WT_CACHE     <- file.path(PROJECT_ROOT, "data", "west-texas", "cache")
dir.create(WT_CACHE, recursive = TRUE, showWarnings = FALSE)

BEA_BASE <- "https://apps.bea.gov/api/data/"

# FIPS codes: 4 counties + Texas + US
GEO_FIPS <- c("48435", "48413", "48105", "48267", "48000", "00000")

GEO_LABELS <- c(
  "48435" = "Sutton Co. (Sonora)",
  "48413" = "Schleicher Co. (Eldorado)",
  "48105" = "Crockett Co. (Ozona)",
  "48267" = "Kimble Co. (Junction)",
  "48000" = "Texas",
  "00000" = "United States"
)

GEO_KEYS <- c(
  "48435" = "sutton",
  "48413" = "schleicher",
  "48105" = "crockett",
  "48267" = "kimble",
  "48000" = "TX",
  "00000" = "US"
)

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

# ---- Core BEA API call -----------------------------------------------------

bea_get <- function(dataset, table_name, line_code, geo_fips) {
  api_key <- Sys.getenv("BEA_API_KEY")
  if (!nzchar(api_key)) stop("BEA_API_KEY is not set.", call. = FALSE)

  req <- request(BEA_BASE) |>
    req_url_query(
      UserID     = api_key,
      method     = "GetData",
      datasetname = dataset,
      TableName  = table_name,
      LineCode   = line_code,
      GeoFips    = paste(geo_fips, collapse = ","),
      Year       = "ALL",
      ResultFormat = "JSON"
    ) |>
    req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
    req_timeout(60) |>
    req_retry(max_tries = 3, backoff = \(n) 5 * n)

  resp <- req_perform(req)
  parsed <- resp_body_json(resp)


  # Check for API errors (e.g., inactive key)
  if (!is.null(parsed$BEAAPI$Results$Error)) {
    err_msg <- parsed$BEAAPI$Results$Error$APIErrorDescription %||%
               "Unknown BEA API error"
    warning("BEA API error: ", err_msg, call. = FALSE)
    return(tibble())
  }

  # BEA wraps results in BEAAPI.Results.Data
  data_list <- parsed$BEAAPI$Results$Data
  if (is.null(data_list) || length(data_list) == 0) {
    warning("BEA returned no data for ", dataset, "/", table_name, call. = FALSE)
    return(tibble())
  }

  rows <- lapply(data_list, function(d) {
    val <- suppressWarnings(as.numeric(gsub(",", "", d$DataValue %||% "")))
    tibble(
      geo_fips  = d$GeoFips %||% NA_character_,
      geo_name  = d$GeoName %||% NA_character_,
      year      = as.integer(d$TimePeriod %||% NA),
      value     = val
    )
  })

  bind_rows(rows) |> filter(!is.na(year), !is.na(value))
}

# ---- Fetch per-capita personal income (CAINC1, line 3) --------------------

fetch_bea_income <- function() {
  cache_file <- file.path(WT_CACHE, "bea_income.csv")

  message("  [bea_income] fetching CAINC1 per-capita income for West TX counties")

  raw <- tryCatch(
    bea_get("Regional", "CAINC1", "3", GEO_FIPS),
    error = function(e) {
      warning("BEA income fetch failed: ", conditionMessage(e), call. = FALSE)
      return(tibble())
    }
  )

  if (nrow(raw) == 0) {
    message("  [bea_income] no data returned")
    return(invisible(NULL))
  }

  out <- raw |>
    mutate(
      geo   = GEO_KEYS[geo_fips],
      geo_label = GEO_LABELS[geo_fips]
    ) |>
    select(year, geo, geo_label, per_capita_income = value) |>
    filter(!is.na(geo)) |>
    arrange(year, geo)

  write_csv(out, cache_file)
  message(sprintf("  [bea_income] wrote %d rows (%d–%d) to %s",
                  nrow(out), min(out$year), max(out$year), basename(cache_file)))
  invisible(NULL)
}

# ---- Fetch county GDP (CAGDP1, line 1 = total GDP) ------------------------

fetch_bea_gdp <- function() {
  cache_file <- file.path(WT_CACHE, "bea_gdp.csv")

  message("  [bea_gdp] fetching CAGDP1 county GDP for West TX counties")

  raw <- tryCatch(
    bea_get("Regional", "CAGDP1", "1", GEO_FIPS),
    error = function(e) {
      warning("BEA GDP fetch failed: ", conditionMessage(e), call. = FALSE)
      return(tibble())
    }
  )

  if (nrow(raw) == 0) {
    message("  [bea_gdp] no data returned")
    return(invisible(NULL))
  }

  out <- raw |>
    mutate(
      geo   = GEO_KEYS[geo_fips],
      geo_label = GEO_LABELS[geo_fips]
    ) |>
    select(year, geo, geo_label, gdp = value) |>
    filter(!is.na(geo)) |>
    arrange(year, geo)

  write_csv(out, cache_file)
  message(sprintf("  [bea_gdp] wrote %d rows (%d–%d) to %s",
                  nrow(out), min(out$year), max(out$year), basename(cache_file)))
  invisible(NULL)
}

# ---- Orchestrator ----------------------------------------------------------

fetch_bea_all <- function() {
  message("Fetching BEA county income and GDP data")

  api_key <- Sys.getenv("BEA_API_KEY")
  if (!nzchar(api_key)) {
    warning("BEA_API_KEY not set; skipping BEA fetch.", call. = FALSE)
    return(invisible(NULL))
  }

  fetch_bea_income()
  Sys.sleep(2)  # rate-limit courtesy
  fetch_bea_gdp()

  invisible(NULL)
}
