# -----------------------------------------------------------------------------
# fetch_mediacloud.R
#
# Monthly US-presidency story-volume fetcher via Media Cloud's Search API.
# Complements GDELT tone with a *volume* signal that goes back further
# (Media Cloud indexes English news back to 2008, some as early as 2000).
#
# API:   https://search.mediacloud.org/api/search/total-count
# Auth:  Authorization: Token <MEDIA_CLOUD_API_KEY>
# Query: ("white house" OR president OR presidential)
# Output: data/sentiment/cache/mediacloud_volume.csv  (date, relevant, total)
#
# Fail-safe: missing key → skip; API error → warn, keep cache.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(httr2)
  library(lubridate)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
MC_CACHE     <- file.path(PROJECT_ROOT, "data", "sentiment", "cache",
                          "mediacloud_volume.csv")
dir.create(dirname(MC_CACHE), recursive = TRUE, showWarnings = FALSE)

MC_BOOTSTRAP <- as.Date("2008-01-01")   # Media Cloud's reliable earliest
MC_QUERY     <- '("white house" OR president OR presidential)'
MC_SLEEP     <- 0.3  # seconds between requests

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0) b else a

mc_fetch_month <- function(year, month, api_key) {
  start <- as.Date(sprintf("%d-%02d-01", year, month))
  end   <- seq(start, by = "1 month", length.out = 2)[2] - 1

  req <- request("https://search.mediacloud.org/api/search/total-count") |>
    req_url_query(
      q     = MC_QUERY,
      start = format(start, "%Y-%m-%d"),
      end   = format(end,   "%Y-%m-%d")
    ) |>
    req_headers(Authorization = paste("Token", api_key)) |>
    req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
    req_timeout(60) |>
    req_retry(max_tries = 3, backoff = \(n) 5 * n)

  parsed <- tryCatch({
    resp <- req_perform(req)
    resp_body_json(resp, simplifyVector = FALSE)
  }, error = function(e) {
    warning(sprintf("  [mediacloud] %d-%02d failed: %s",
                    year, month, conditionMessage(e)), call. = FALSE)
    NULL
  })

  relevant <- if (!is.null(parsed)) as.integer(parsed$count$relevant %||% NA) else NA_integer_
  total    <- if (!is.null(parsed)) as.integer(parsed$count$total    %||% NA) else NA_integer_

  tibble(year = year, month = month, date = start,
         relevant = relevant, total = total)
}

fetch_mediacloud_volume <- function() {
  api_key <- Sys.getenv("MEDIA_CLOUD_API_KEY")
  if (!nzchar(api_key)) {
    message("[mediacloud] MEDIA_CLOUD_API_KEY not set — skipping")
    return(invisible(NULL))
  }

  existing <- if (file.exists(MC_CACHE)) {
    read_csv(MC_CACHE, show_col_types = FALSE,
             col_types = cols(date = col_date(), year = col_integer(),
                              month = col_integer(),
                              relevant = col_integer(), total = col_integer()))
  } else {
    tibble(date = as.Date(character()), year = integer(), month = integer(),
           relevant = integer(), total = integer())
  }

  start_date <- if (nrow(existing) > 0) {
    seq(max(existing$date), by = "1 month", length.out = 2)[2]
  } else {
    MC_BOOTSTRAP
  }
  end_date <- as.Date(format(Sys.Date(), "%Y-%m-01"))  # current month start

  if (start_date > end_date) {
    message(sprintf("  [mediacloud] cache up-to-date (latest %s)", max(existing$date)))
    return(existing)
  }

  months_to_fetch <- seq(start_date, end_date, by = "1 month")
  message(sprintf("Fetching Media Cloud volume: %d months from %s to %s",
                  length(months_to_fetch), start_date, end_date))

  new_rows <- list()
  for (i in seq_along(months_to_fetch)) {
    d <- months_to_fetch[i]
    y <- as.integer(format(d, "%Y"))
    m <- as.integer(format(d, "%m"))
    new_rows[[i]] <- mc_fetch_month(y, m, api_key)
    if (i %% 24 == 0) {
      message(sprintf("  [mediacloud] %d/%d months fetched",
                      i, length(months_to_fetch)))
    }
    Sys.sleep(MC_SLEEP)
  }

  new_df <- bind_rows(new_rows) |> filter(!is.na(relevant))
  if (nrow(new_df) == 0) {
    message("  [mediacloud] no new data")
    return(existing)
  }

  merged <- bind_rows(existing, new_df) |>
    distinct(year, month, .keep_all = TRUE) |>
    arrange(date)

  write_csv(merged, MC_CACHE)
  message(sprintf("  [mediacloud] wrote %d rows (+%d new) to %s",
                  nrow(merged), nrow(new_df), basename(MC_CACHE)))
  merged
}
