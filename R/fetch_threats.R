# -----------------------------------------------------------------------------
# fetch_threats.R
#
# Daily snapshot fetchers for two Abuse.ch public-domain feeds:
#   * FeodoTracker  — active botnet C2 infrastructure (JSON)
#   * ThreatFox     — recent malicious IoCs incl. IP:port C2s (CSV)
#
# Each run saves a dated snapshot under data/cybersecurity/cache/ so that
# daily history accumulates. Existing snapshots for the same date are kept.
#
# Attribution (required on every page rendering this data):
#   FeodoTracker  https://feodotracker.abuse.ch/
#   ThreatFox     https://threatfox.abuse.ch/
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
CYBER_DIR    <- file.path(PROJECT_ROOT, "data", "cybersecurity")
CYBER_CACHE  <- file.path(CYBER_DIR, "cache")
dir.create(CYBER_CACHE, recursive = TRUE, showWarnings = FALSE)

FEODO_URL     <- "https://feodotracker.abuse.ch/downloads/ipblocklist.json"
THREATFOX_URL <- "https://threatfox.abuse.ch/export/csv/recent/"

fetch_feodo_snapshot <- function() {
  today <- Sys.Date()
  snap <- file.path(CYBER_CACHE, sprintf("feodo_%s.json", today))
  if (file.exists(snap)) {
    message(sprintf("  [feodo] snapshot for %s already cached", today))
    return(snap)
  }

  message(sprintf("  [feodo] fetching %s", FEODO_URL))
  body <- tryCatch(
    request(FEODO_URL) |>
      req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
      req_timeout(60) |>
      req_retry(max_tries = 3, backoff = \(n) 5 * n) |>
      req_perform() |>
      resp_body_string(),
    error = function(e) {
      warning("FeodoTracker fetch failed: ", conditionMessage(e), call. = FALSE)
      NULL
    }
  )
  if (is.null(body)) return(NULL)
  writeLines(body, snap)
  n <- length(jsonlite::fromJSON(body, simplifyVector = FALSE))
  message(sprintf("  [feodo] cached %d rows to %s", n, basename(snap)))
  snap
}

fetch_threatfox_snapshot <- function() {
  today <- Sys.Date()
  snap  <- file.path(CYBER_CACHE, sprintf("threatfox_%s.csv", today))
  if (file.exists(snap)) {
    message(sprintf("  [threatfox] snapshot for %s already cached", today))
    return(snap)
  }

  message(sprintf("  [threatfox] fetching %s", THREATFOX_URL))
  body <- tryCatch(
    request(THREATFOX_URL) |>
      req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
      req_timeout(60) |>
      req_retry(max_tries = 3, backoff = \(n) 5 * n) |>
      req_perform() |>
      resp_body_string(),
    error = function(e) {
      warning("ThreatFox fetch failed: ", conditionMessage(e), call. = FALSE)
      NULL
    }
  )
  if (is.null(body)) return(NULL)
  writeLines(body, snap)
  # Rough row count (data lines, non-comment, non-blank)
  n <- sum(!grepl("^#|^$", strsplit(body, "\n")[[1]]))
  message(sprintf("  [threatfox] cached ~%d rows to %s", max(0, n - 1), basename(snap)))
  snap
}

fetch_threats_all <- function() {
  message("Fetching cybersecurity threat feeds")
  fetch_feodo_snapshot()
  fetch_threatfox_snapshot()
  invisible(NULL)
}
