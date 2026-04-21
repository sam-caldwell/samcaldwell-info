# -----------------------------------------------------------------------------
# fetch_eia.R
#
# Wrapper around the EIA Open Data API v2, covering the series the Energy
# analysis uses but that aren't on FRED:
#   * PADD-level weekly retail gasoline prices (5 US regions)
#   * STEO (Short-Term Energy Outlook) monthly forecast series
#   * Select international retail-fuel / production series
#
# Auth: EIA_API_KEY from environment. Register free at
#       https://www.eia.gov/opendata/register.php.
# License: EIA data are public domain (US government work). Attribution still
# required as courtesy on pages that display it.
#
# Incremental caching: each series is cached to data/energy/cache/<key>.csv
# and only new observations since max(date) are fetched on subsequent runs.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(httr2)
  library(lubridate)
})

PROJECT_ROOT  <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
ENERGY_CACHE  <- file.path(PROJECT_ROOT, "data", "energy", "cache")
dir.create(ENERGY_CACHE, recursive = TRUE, showWarnings = FALSE)

EIA_BASE <- "https://api.eia.gov/v2"

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

# ---- Core fetch primitive ---------------------------------------------------

eia_get <- function(path, facets = list(), frequency = NULL,
                    start = NULL, end = NULL, length_limit = 5000,
                    offset = 0) {
  api_key <- Sys.getenv("EIA_API_KEY")
  if (!nzchar(api_key)) {
    stop("EIA_API_KEY is not set.", call. = FALSE)
  }

  req <- request(paste0(EIA_BASE, path)) |>
    req_url_query(api_key = api_key) |>
    req_url_query(`data[0]` = "value") |>
    req_url_query(`sort[0][column]` = "period",
                  `sort[0][direction]` = "asc") |>
    req_url_query(length = length_limit, offset = offset) |>
    req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
    req_timeout(60) |>
    req_retry(max_tries = 3, backoff = \(n) 5 * n)

  if (!is.null(frequency))  req <- req_url_query(req, frequency = frequency)
  if (!is.null(start))      req <- req_url_query(req, start = start)
  if (!is.null(end))        req <- req_url_query(req, end = end)

  # EIA expects facets[<name>][]=<value1>&facets[<name>][]=<value2>…  httr2's
  # default rejects vector-valued params; explode them manually into the URL
  # so the duplicate-key pattern is preserved.
  extra_qs <- character()
  for (fname in names(facets)) {
    for (v in facets[[fname]]) {
      extra_qs <- c(extra_qs,
                    paste0("facets%5B", utils::URLencode(fname, reserved = TRUE),
                           "%5D%5B%5D=",
                           utils::URLencode(as.character(v), reserved = TRUE)))
    }
  }
  if (length(extra_qs) > 0) {
    # Append to the URL that req has already built.
    current_url <- req$url
    sep <- if (grepl("\\?", current_url)) "&" else "?"
    req$url <- paste0(current_url, sep, paste(extra_qs, collapse = "&"))
  }

  resp <- tryCatch(req_perform(req) |> resp_body_json(simplifyVector = FALSE),
                   error = function(e) {
                     warning("  [eia] request failed: ", conditionMessage(e),
                             call. = FALSE)
                     NULL
                   })
  if (is.null(resp)) return(tibble())
  rows <- resp$response$data %||% list()
  if (length(rows) == 0) return(tibble())

  # EIA endpoints return different field shapes:
  #   petroleum/pri/gnd:    series, duoarea, area-name, product
  #   steo:                 seriesId, seriesDescription
  #   international:        countryRegionId, countryRegionName, productId
  # Normalize to a common tibble schema used by the build layer.
  tibble(
    period    = vapply(rows, \(r) as.character(r$period %||% NA), character(1)),
    value     = vapply(rows, \(r) suppressWarnings(as.numeric(r$value %||% NA)), numeric(1)),
    series_id = vapply(rows, \(r)
                       as.character(r$series %||% r$seriesId %||% NA),
                       character(1)),
    duoarea   = vapply(rows, \(r)
                       as.character(r$duoarea %||% r$countryRegionId %||% NA),
                       character(1)),
    area_name = vapply(rows, \(r)
                       as.character(r$`area-name` %||% r$countryRegionName %||%
                                    r$seriesDescription %||% NA),
                       character(1)),
    product   = vapply(rows, \(r)
                       as.character(r$product %||% r$productId %||% NA),
                       character(1))
  )
}

# ---- Incremental cache helper ----------------------------------------------

cache_file <- function(key) file.path(ENERGY_CACHE, paste0(key, ".csv"))

read_cache <- function(key) {
  p <- cache_file(key)
  if (!file.exists(p) || file.size(p) == 0) {
    return(tibble(period = character(), value = numeric(),
                  series_id = character(), duoarea = character(),
                  area_name = character(), product = character()))
  }
  read_csv(p, show_col_types = FALSE,
           col_types = cols(period = "c", value = "d", series_id = "c",
                            duoarea = "c", area_name = "c", product = "c"))
}

write_cache <- function(key, df) write_csv(df, cache_file(key))

fetch_cached <- function(key, path, facets = list(), frequency,
                         bootstrap_start = "1999-01-01") {
  existing <- read_cache(key)
  start_period <- if (nrow(existing) > 0) {
    # Start the day after the latest period we already have.
    max_p <- max(existing$period, na.rm = TRUE)
    # period format varies by frequency; EIA accepts "YYYY-MM-DD", "YYYY-MM"
    if (nchar(max_p) >= 10) {
      as.character(as.Date(max_p) + 1)
    } else if (nchar(max_p) == 7) {
      # monthly: next month
      format(seq(as.Date(paste0(max_p, "-01")), by = "1 month", length.out = 2)[2], "%Y-%m")
    } else {
      bootstrap_start
    }
  } else {
    bootstrap_start
  }

  message(sprintf("  [eia] %s: fetching from %s", key, start_period))
  new_rows <- eia_get(path, facets = facets, frequency = frequency,
                      start = start_period)

  if (nrow(new_rows) == 0) {
    message(sprintf("  [eia] %s: no new rows", key))
    return(existing)
  }

  merged <- bind_rows(existing, new_rows) |>
    distinct(period, series_id, duoarea, .keep_all = TRUE) |>
    arrange(period)
  write_cache(key, merged)
  message(sprintf("  [eia] %s: wrote %d rows (+%d new)",
                  key, nrow(merged), nrow(new_rows)))
  merged
}

# ---- PADD-level weekly retail gasoline (5 US regions) ----------------------

PADD_REGIONS <- c(
  R10 = "PADD 1",   # East Coast
  R20 = "PADD 2",   # Midwest
  R30 = "PADD 3",   # Gulf Coast
  R40 = "PADD 4",   # Rocky Mountain
  R50 = "PADD 5"    # West Coast
)

fetch_padd_gasoline <- function() {
  fetch_cached(
    key = "padd_gasoline_weekly",
    path = "/petroleum/pri/gnd/data/",
    facets = list(
      duoarea = names(PADD_REGIONS),
      product = c("EPMR")          # Regular motor gasoline
    ),
    frequency = "weekly",
    bootstrap_start = "2015-01-01"  # 10-year window is enough for our maps
  )
}

# ---- STEO short-term energy outlook ----------------------------------------
# Pull a small set of forward-looking series: WTI price, US crude production,
# US gasoline retail price, Henry Hub natgas, US electricity generation.
STEO_SERIES <- c(
  WTIPUUS = "WTI crude oil spot price",
  COPRPUS = "US crude oil production",
  PATCPUS = "US refiner product price — gasoline",
  NGHHMCF = "Henry Hub natural-gas spot price",
  TETCPUS = "US total electricity net generation"
)

fetch_steo <- function() {
  fetch_cached(
    key = "steo_monthly",
    path = "/steo/data/",
    facets = list(seriesId = names(STEO_SERIES)),
    frequency = "monthly",
    bootstrap_start = "2018-01"
  )
}

# ---- International prices (select countries) -------------------------------
# EIA international has retail gasoline monthly for a handful of OECD countries
# via the 'international' data-set. This is best-effort — if the endpoint
# shape changes, cache stays untouched.

INTL_COUNTRIES <- c("USA", "CAN", "GBR", "DEU", "FRA", "ITA", "JPN", "KOR",
                    "MEX", "CHN", "IND", "BRA", "AUS")

fetch_intl_gasoline <- function() {
  fetch_cached(
    key = "intl_gasoline_monthly",
    path = "/international/data/",
    facets = list(
      # Unleaded gasoline retail prices (activityId 6 = "Retail prices";
      # productId 57 = "Gasoline (regular, 2-axis)") — EIA's classifications
      # are not always stable; we pull broadly and filter downstream.
      countryRegionId = INTL_COUNTRIES,
      productId = c("57"),
      activityId = c("6")
    ),
    frequency = "monthly",
    bootstrap_start = "2005-01"
  )
}

# ---- Orchestrator -----------------------------------------------------------

fetch_eia_all <- function() {
  if (!nzchar(Sys.getenv("EIA_API_KEY"))) {
    message("[eia] EIA_API_KEY not set — skipping EIA fetches")
    return(invisible(NULL))
  }
  message("Fetching EIA series")

  tryCatch(fetch_padd_gasoline(),
           error = function(e) warning("  PADD gasoline fetch failed: ",
                                       conditionMessage(e), call. = FALSE))
  tryCatch(fetch_steo(),
           error = function(e) warning("  STEO fetch failed: ",
                                       conditionMessage(e), call. = FALSE))
  # International retail prices aren't in EIA's free API; intl-markets page
  # uses WTI vs Brent spread from FRED instead. Intentionally not fetched.
  invisible(NULL)
}
