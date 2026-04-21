# -----------------------------------------------------------------------------
# fetch_cves.R
#
# Daily fetcher for three public-domain CVE data sources:
#
#   1. CISA KEV   — Known Exploited Vulnerabilities Catalog. Authoritative
#                   list of CVEs with confirmed active exploitation in the
#                   wild. Public domain (US government work).
#                   https://www.cisa.gov/known-exploited-vulnerabilities-catalog
#
#   2. FIRST EPSS — Exploit Prediction Scoring System. Daily probability
#                   that each CVE will be exploited in the next 30 days.
#                   CC-BY-SA. https://www.first.org/epss/
#
#   3. NVD        — National Vulnerability Database CVSS scores per CVE.
#                   Public domain (NIST).
#                   https://services.nvd.nist.gov/rest/json/cves/2.0/
#
# Snapshots saved to data/cybersecurity/cache/. The EPSS cache is persistent
# so we can compare "initial" (first-seen) EPSS to "current" EPSS per CVE.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(httr2)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
CYBER_DIR    <- file.path(PROJECT_ROOT, "data", "cybersecurity")
CYBER_CACHE  <- file.path(CYBER_DIR, "cache")
dir.create(CYBER_CACHE, recursive = TRUE, showWarnings = FALSE)

KEV_URL  <- "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
EPSS_URL <- function(d = Sys.Date())
  sprintf("https://epss.cyentia.com/epss_scores-%s.csv.gz", format(d, "%Y-%m-%d"))

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0) b else a

# ---- CISA KEV fetcher -------------------------------------------------------

fetch_kev <- function() {
  today <- Sys.Date()
  snap <- file.path(CYBER_CACHE, sprintf("kev_%s.json", today))
  if (file.exists(snap)) {
    message(sprintf("  [kev] snapshot for %s already cached", today))
    return(snap)
  }
  message(sprintf("  [kev] fetching %s", KEV_URL))
  body <- tryCatch(
    request(KEV_URL) |>
      req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
      req_timeout(60) |>
      req_retry(max_tries = 3, backoff = \(n) 5 * n) |>
      req_perform() |>
      resp_body_string(),
    error = function(e) {
      warning("KEV fetch failed: ", conditionMessage(e), call. = FALSE)
      NULL
    }
  )
  if (is.null(body)) return(NULL)
  writeLines(body, snap)
  n <- length(jsonlite::fromJSON(body, simplifyVector = FALSE)$vulnerabilities %||% list())
  message(sprintf("  [kev] cached %d vulnerabilities", n))
  snap
}

# ---- EPSS fetcher (persistent; only "initial" per CVE is stored forever) ----

EPSS_PERSISTENT <- file.path(CYBER_CACHE, "epss_history.csv")

fetch_epss_today <- function() {
  today <- Sys.Date()
  daily <- file.path(CYBER_CACHE, sprintf("epss_%s.csv.gz", today))
  if (!file.exists(daily)) {
    url <- EPSS_URL(today)
    message(sprintf("  [epss] fetching %s", url))
    ok <- tryCatch({
      download.file(url, daily, mode = "wb", quiet = TRUE)
      TRUE
    }, error = function(e) {
      warning("EPSS fetch failed: ", conditionMessage(e), call. = FALSE)
      FALSE
    })
    if (!ok || !file.exists(daily)) return(NULL)
  } else {
    message(sprintf("  [epss] %s already cached", today))
  }

  # Parse today's EPSS file
  today_df <- tryCatch(
    read_csv(daily, skip = 1, show_col_types = FALSE,
             col_types = cols(cve = "c", epss = "d", percentile = "d")),
    error = function(e) {
      warning("EPSS parse failed: ", conditionMessage(e), call. = FALSE)
      NULL
    }
  )
  if (is.null(today_df)) return(NULL)
  today_df$date <- today
  today_df
}

update_epss_history <- function(today_df) {
  if (is.null(today_df) || nrow(today_df) == 0) return(invisible(NULL))

  existing <- if (file.exists(EPSS_PERSISTENT)) {
    read_csv(EPSS_PERSISTENT, show_col_types = FALSE,
             col_types = cols(cve = "c", initial_epss = "d",
                              initial_percentile = "d", initial_date = "D",
                              current_epss = "d", current_percentile = "d",
                              current_date = "D"))
  } else {
    tibble(cve = character(), initial_epss = numeric(),
           initial_percentile = numeric(), initial_date = as.Date(character()),
           current_epss = numeric(), current_percentile = numeric(),
           current_date = as.Date(character()))
  }

  existing_set <- existing$cve
  today_grouped <- today_df |>
    group_by(cve) |>
    summarize(epss = first(epss), percentile = first(percentile),
              date = first(date), .groups = "drop")

  # Update "current" for CVEs we already track
  updated <- today_grouped |>
    filter(cve %in% existing_set) |>
    transmute(cve, current_epss = epss, current_percentile = percentile,
              current_date = date)

  # First-seen entries for new CVEs
  new_cves <- today_grouped |>
    filter(!(cve %in% existing_set)) |>
    transmute(cve,
              initial_epss = epss,
              initial_percentile = percentile,
              initial_date = date,
              current_epss = epss,
              current_percentile = percentile,
              current_date = date)

  merged <- existing |>
    rows_update(updated, by = "cve", unmatched = "ignore") |>
    bind_rows(new_cves) |>
    distinct(cve, .keep_all = TRUE)

  write_csv(merged, EPSS_PERSISTENT)
  message(sprintf("  [epss] history now %d CVEs (+%d new)",
                  nrow(merged), nrow(new_cves)))
  invisible(merged)
}

fetch_epss <- function() {
  today_df <- fetch_epss_today()
  update_epss_history(today_df)
}

# ---- NVD CVSS fetcher (for KEV CVEs only; cached per-CVE) -------------------

NVD_CACHE <- file.path(CYBER_CACHE, "nvd_cvss.csv")

load_nvd_cache <- function() {
  if (!file.exists(NVD_CACHE)) {
    return(tibble(cve = character(), cvss_v3_base = numeric(),
                  cvss_v3_severity = character(),
                  cvss_v2_base = numeric(), last_fetched = as.Date(character())))
  }
  read_csv(NVD_CACHE, show_col_types = FALSE)
}

save_nvd_cache <- function(cache) write_csv(cache, NVD_CACHE)

fetch_nvd_cvss <- function(cves_needed) {
  cache <- load_nvd_cache()
  missing <- setdiff(cves_needed, cache$cve)
  if (length(missing) == 0) return(cache)

  message(sprintf("  [nvd] looking up %d CVEs (2 req/sec)", length(missing)))
  new_rows <- list()

  for (cve_id in missing) {
    url <- sprintf("https://services.nvd.nist.gov/rest/json/cves/2.0/?cveId=%s", cve_id)
    res <- tryCatch(
      request(url) |>
        req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
        req_timeout(30) |>
        req_retry(max_tries = 3, backoff = \(n) 10 * n) |>
        req_perform() |>
        resp_body_json(simplifyVector = FALSE),
      error = function(e) NULL
    )

    v3 <- NA_real_; sev <- NA_character_; v2 <- NA_real_
    if (!is.null(res) && length(res$vulnerabilities) > 0) {
      metrics <- res$vulnerabilities[[1]]$cve$metrics
      if (!is.null(metrics$cvssMetricV31) && length(metrics$cvssMetricV31) > 0) {
        v3  <- as.numeric(metrics$cvssMetricV31[[1]]$cvssData$baseScore %||% NA)
        sev <- as.character(metrics$cvssMetricV31[[1]]$cvssData$baseSeverity %||% NA)
      } else if (!is.null(metrics$cvssMetricV30) && length(metrics$cvssMetricV30) > 0) {
        v3  <- as.numeric(metrics$cvssMetricV30[[1]]$cvssData$baseScore %||% NA)
        sev <- as.character(metrics$cvssMetricV30[[1]]$cvssData$baseSeverity %||% NA)
      }
      if (!is.null(metrics$cvssMetricV2) && length(metrics$cvssMetricV2) > 0) {
        v2 <- as.numeric(metrics$cvssMetricV2[[1]]$cvssData$baseScore %||% NA)
      }
    }

    new_rows[[length(new_rows) + 1]] <- tibble(
      cve = cve_id, cvss_v3_base = v3, cvss_v3_severity = sev,
      cvss_v2_base = v2, last_fetched = Sys.Date()
    )
    Sys.sleep(0.6)  # NVD recommends ≤2 req/sec without API key
  }

  merged <- bind_rows(cache, bind_rows(new_rows)) |>
    distinct(cve, .keep_all = TRUE)
  save_nvd_cache(merged)
  merged
}

# ---- Orchestrator -----------------------------------------------------------

fetch_cves_all <- function() {
  message("Fetching CVE data (CISA KEV, EPSS, NVD CVSS)")
  fetch_kev()
  fetch_epss()
  # NVD CVSS is filled in by build_cves() as it discovers which CVEs need scores
  invisible(NULL)
}
