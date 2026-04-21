# -----------------------------------------------------------------------------
# build_cves.R
#
# Assembles a per-CVE table joining CISA KEV (is-in-wild), EPSS (initial and
# current scores), and NVD CVSS. Only CVEs in KEV are included — that's the
# "exploit in the wild" universe.
#
# Output: data/cybersecurity/cves_kev.csv with columns:
#   cve, vendor_project, product, vulnerability_name, short_description,
#   date_added, cvss_v3_base, cvss_v3_severity, cvss_v2_base,
#   initial_epss, initial_percentile, initial_date,
#   current_epss, current_percentile, current_date,
#   epss_delta, required_action, due_date, in_wild
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(purrr)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
CYBER_DIR    <- file.path(PROJECT_ROOT, "data", "cybersecurity")
CYBER_CACHE  <- file.path(CYBER_DIR, "cache")

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0) b else a

read_latest_kev <- function() {
  files <- list.files(CYBER_CACHE, pattern = "^kev_\\d{4}-\\d{2}-\\d{2}\\.json$",
                      full.names = TRUE)
  if (length(files) == 0) return(tibble())
  latest <- files[order(basename(files), decreasing = TRUE)][1]

  body <- tryCatch(jsonlite::fromJSON(latest, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body) || is.null(body$vulnerabilities)) return(tibble())

  rows <- lapply(body$vulnerabilities, function(v) tibble(
    cve                = v$cveID                %||% NA_character_,
    vendor_project     = v$vendorProject        %||% NA_character_,
    product            = v$product              %||% NA_character_,
    vulnerability_name = v$vulnerabilityName    %||% NA_character_,
    short_description  = v$shortDescription     %||% NA_character_,
    date_added         = as.Date(v$dateAdded    %||% NA),
    required_action    = v$requiredAction       %||% NA_character_,
    due_date           = as.Date(v$dueDate      %||% NA),
    in_wild            = TRUE
  ))
  bind_rows(rows)
}

build_cves <- function() {
  kev <- read_latest_kev()
  if (nrow(kev) == 0) {
    message("  [cve] no KEV snapshot available; skipping CVE build")
    return(invisible(NULL))
  }

  # EPSS history (initial + current per CVE)
  epss_path <- file.path(CYBER_CACHE, "epss_history.csv")
  epss <- if (file.exists(epss_path)) {
    read_csv(epss_path, show_col_types = FALSE)
  } else {
    tibble(cve = character())
  }

  # NVD CVSS — fetch on demand for KEV CVEs we don't yet have scored
  source(file.path(PROJECT_ROOT, "R", "fetch_cves.R"), chdir = FALSE)
  nvd <- fetch_nvd_cvss(kev$cve)

  joined <- kev |>
    left_join(epss, by = "cve") |>
    left_join(nvd |> select(cve, cvss_v3_base, cvss_v3_severity, cvss_v2_base),
              by = "cve") |>
    mutate(
      epss_delta = round(current_epss - initial_epss, 4),
      # If we only have a current EPSS (never saw it previously), initial_* is NA
    ) |>
    arrange(desc(current_epss), desc(cvss_v3_base))

  write_csv(joined, file.path(CYBER_DIR, "cves_kev.csv"))

  # Summary row for index page
  cve_summary <- tibble(
    as_of         = Sys.Date(),
    kev_total     = nrow(kev),
    kev_added_30d = sum(kev$date_added >= (Sys.Date() - 30), na.rm = TRUE),
    top_epss      = {
      o <- order(joined$current_epss, decreasing = TRUE,
                 na.last = TRUE)
      joined$cve[o[1]]
    },
    top_epss_score = max(joined$current_epss, na.rm = TRUE),
    median_epss    = median(joined$current_epss, na.rm = TRUE),
    median_cvss_v3 = median(joined$cvss_v3_base, na.rm = TRUE)
  )
  write_csv(cve_summary, file.path(CYBER_DIR, "cves_summary.csv"))

  cat(sprintf("build_cves: %d KEV CVEs (%d added in last 30 days); top EPSS %s = %.3f\n",
              cve_summary$kev_total,
              cve_summary$kev_added_30d,
              cve_summary$top_epss,
              cve_summary$top_epss_score))
  invisible(NULL)
}
