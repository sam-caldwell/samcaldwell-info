# -----------------------------------------------------------------------------
# fetch_gdelt.R
#
# Incremental fetcher for the GDELT Doc 2.0 API — daily "average tone" of
# English-language US news mentioning the US presidency / White House.
#
# Coverage: GDELT GKG starts April 2015.
# Query:    ("white house" OR president OR presidential) sourcelang:eng
#           sourcecountry:US
# Source:   https://api.gdeltproject.org/api/v2/doc/doc
# License:  GDELT is CC-BY-NC. Attribution appears in sentiment/media.qmd
#           and sentiment/about.qmd. Non-commercial use only.
#
# Output:   data/sentiment/cache/gdelt_tone.csv  (date, tone, volume)
#
# Rate limit: 1 request / 5 seconds. The fetcher sleeps 6s between chunks.
# Fail-safe: any chunk error is logged and the cache is left untouched.
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
GDELT_CACHE  <- file.path(PROJECT_ROOT, "data", "sentiment", "cache", "gdelt_tone.csv")
dir.create(dirname(GDELT_CACHE), recursive = TRUE, showWarnings = FALSE)

GDELT_BOOTSTRAP <- as.Date("2015-04-01")
GDELT_QUERY     <- '("white house" OR president OR presidential) sourcelang:eng sourcecountry:US'
GDELT_CHUNK_MONTHS <- 3
GDELT_SLEEP_SECONDS <- 6

gdelt_format_dt <- function(d) paste0(format(d, "%Y%m%d"), "000000")

gdelt_fetch_range <- function(start_date, end_date) {
  stopifnot(start_date <= end_date)

  req <- request("https://api.gdeltproject.org/api/v2/doc/doc") |>
    req_url_query(
      query         = GDELT_QUERY,
      mode          = "timelinetone",
      format        = "json",
      startdatetime = gdelt_format_dt(start_date),
      enddatetime   = gdelt_format_dt(end_date + 1)
    ) |>
    req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
    req_timeout(60) |>
    req_retry(max_tries = 3, backoff = \(n) 10 * n)

  body <- tryCatch(
    req_perform(req) |> resp_body_string(),
    error = function(e) {
      warning(sprintf("  [gdelt] HTTP error for %s–%s: %s",
                      start_date, end_date, conditionMessage(e)), call. = FALSE)
      NULL
    }
  )

  if (is.null(body)) {
    return(tibble(date = as.Date(character()), tone = numeric(), volume = integer()))
  }

  # GDELT returns plain text for rate-limit / error; JSON only on success
  if (!startsWith(trimws(body), "{")) {
    warning(sprintf("  [gdelt] non-JSON response for %s–%s: %s",
                    start_date, end_date, substr(body, 1, 120)), call. = FALSE)
    return(tibble(date = as.Date(character()), tone = numeric(), volume = integer()))
  }

  parsed <- tryCatch(fromJSON(body, simplifyVector = FALSE),
                     error = function(e) NULL)
  if (is.null(parsed) || is.null(parsed$timeline) || length(parsed$timeline) == 0) {
    return(tibble(date = as.Date(character()), tone = numeric(), volume = integer()))
  }

  rows <- parsed$timeline[[1]]$data
  if (length(rows) == 0) {
    return(tibble(date = as.Date(character()), tone = numeric(), volume = integer()))
  }

  tibble(
    # "20260322T000000Z" → 2026-03-22
    date   = as.Date(substr(vapply(rows, \(x) as.character(x$date), character(1)), 1, 8), "%Y%m%d"),
    tone   = vapply(rows, \(x) as.numeric(x$value), numeric(1)),
    volume = vapply(rows, \(x) suppressWarnings(as.integer(x$norm %||% NA)), integer(1))
  ) |>
    filter(!is.na(date), !is.na(tone))
}

fetch_gdelt_tone <- function() {
  existing <- if (file.exists(GDELT_CACHE)) {
    read_csv(GDELT_CACHE, show_col_types = FALSE,
             col_types = cols(date = col_date(), tone = col_double(),
                              volume = col_integer()))
  } else {
    tibble(date = as.Date(character()), tone = numeric(), volume = integer())
  }

  start_date <- if (nrow(existing) > 0) max(existing$date) + 1 else GDELT_BOOTSTRAP
  end_date   <- Sys.Date() - 1   # yesterday — today's aggregation isn't final

  if (start_date > end_date) {
    message(sprintf("  [gdelt] cache up-to-date (latest %s)", max(existing$date)))
    return(existing)
  }

  message(sprintf("Fetching GDELT tone from %s to %s (%d-month chunks, %ds sleep)...",
                  start_date, end_date, GDELT_CHUNK_MONTHS, GDELT_SLEEP_SECONDS))

  # Build chunk boundaries
  edges <- seq(start_date, end_date, by = paste(GDELT_CHUNK_MONTHS, "months"))
  if (edges[length(edges)] < end_date) edges <- c(edges, end_date)

  new_chunks <- list()
  for (i in seq_len(length(edges) - 1)) {
    s <- edges[i]
    e <- min(edges[i + 1] - 1, end_date)
    message(sprintf("  [gdelt] chunk %d/%d: %s to %s",
                    i, length(edges) - 1, s, e))
    chunk <- gdelt_fetch_range(s, e)
    if (nrow(chunk) > 0) {
      new_chunks[[length(new_chunks) + 1]] <- chunk
      message(sprintf("  [gdelt]   +%d rows", nrow(chunk)))
    }
    if (i < length(edges) - 1) Sys.sleep(GDELT_SLEEP_SECONDS)
  }

  new_df <- bind_rows(new_chunks)
  if (nrow(new_df) == 0) {
    message("  [gdelt] no new data fetched")
    return(existing)
  }

  merged <- bind_rows(existing, new_df) |>
    distinct(date, .keep_all = TRUE) |>
    arrange(date)

  write_csv(merged, GDELT_CACHE)
  message(sprintf("  [gdelt] wrote %d rows (+%d new) to %s",
                  nrow(merged), nrow(new_df), basename(GDELT_CACHE)))
  merged
}
