# -----------------------------------------------------------------------------
# build_cybersecurity.R
#
# Aggregates daily cybersecurity threat snapshots into site-consumable CSVs.
#
# Inputs:
#   data/cybersecurity/cache/feodo_YYYY-MM-DD.json
#   data/cybersecurity/cache/threatfox_YYYY-MM-DD.csv
#   data/cybersecurity/cache/ip_geolocation.csv  (persistent IP geo cache)
#
# Outputs:
#   data/cybersecurity/current_threats.csv       latest snapshot joined with geo
#   data/cybersecurity/current_botnets.csv       latest FeodoTracker joined with geo
#   data/cybersecurity/province_daily.csv        per-day province aggregates
#   data/cybersecurity/malware_family_daily.csv  per-day malware-family counts
#   data/cybersecurity/threats_summary.csv       headline numbers for index page
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(lubridate)
  library(purrr)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
CYBER_DIR    <- file.path(PROJECT_ROOT, "data", "cybersecurity")
CYBER_CACHE  <- file.path(CYBER_DIR, "cache")

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0) b else a

# ---- Parse per-day snapshots ------------------------------------------------

parse_feodo_snapshot <- function(path) {
  d <- as.Date(sub("^feodo_|\\.json$", "", basename(path)))
  body <- tryCatch(jsonlite::fromJSON(path, simplifyVector = TRUE),
                   error = function(e) NULL)
  if (is.null(body) || nrow(body) == 0) return(tibble())
  body |>
    as_tibble() |>
    transmute(
      snapshot_date  = d,
      source         = "FeodoTracker",
      ip             = as.character(ip_address %||% NA),
      port           = suppressWarnings(as.integer(port)),
      status         = status %||% NA_character_,
      as_number      = suppressWarnings(as.integer(as_number)),
      as_name        = as_name %||% NA_character_,
      country_feed   = country %||% NA_character_,
      malware_family = malware %||% NA_character_,
      first_seen     = suppressWarnings(as.Date(first_seen)),
      last_online    = suppressWarnings(as.Date(last_online))
    ) |>
    filter(!is.na(ip))
}

parse_threatfox_snapshot <- function(path) {
  d <- as.Date(sub("^threatfox_|\\.csv$", "", basename(path)))

  # ThreatFox's header lives in a `#`-commented line. Skip all comments and
  # supply explicit column names (16-column layout per ThreatFox docs).
  tf_cols <- c("first_seen_utc", "ioc_id", "ioc_value", "ioc_type",
               "threat_type", "fk_malware", "malware_alias", "malware_printable",
               "last_seen_utc", "confidence_level", "is_compromised",
               "reference", "tags", "anonymous", "reporter")

  body <- tryCatch(
    read_csv(path, show_col_types = FALSE, comment = "#",
             col_names = tf_cols, col_types = cols(.default = "c"),
             trim_ws = TRUE),
    error = function(e) NULL
  )
  if (is.null(body) || nrow(body) == 0) return(tibble())

  body |>
    filter(!is.na(ioc_type), ioc_type %in% c("ip:port", "ip")) |>
    transmute(
      snapshot_date  = d,
      source         = "ThreatFox",
      ip             = sub(":.*$", "", ioc_value),
      port           = suppressWarnings(as.integer(sub("^[^:]+:", "", ioc_value))),
      status         = NA_character_,
      as_number      = NA_integer_,
      as_name        = NA_character_,
      country_feed   = NA_character_,
      malware_family = ifelse(!is.na(malware_printable) & nzchar(malware_printable),
                              malware_printable, fk_malware),
      # ThreatFox dates: "YYYY-MM-DD HH:MM:SS" or "" — use lubridate which
      # returns NA for empty/malformed inputs without halting the pipeline.
      first_seen     = suppressWarnings(lubridate::as_date(first_seen_utc)),
      last_online    = suppressWarnings(lubridate::as_date(last_seen_utc))
    ) |>
    filter(!is.na(ip), nzchar(ip))
}

read_all_snapshots <- function() {
  feodo_files <- list.files(CYBER_CACHE, pattern = "^feodo_\\d{4}-\\d{2}-\\d{2}\\.json$",
                            full.names = TRUE)
  tf_files    <- list.files(CYBER_CACHE, pattern = "^threatfox_\\d{4}-\\d{2}-\\d{2}\\.csv$",
                            full.names = TRUE)
  feodo <- bind_rows(lapply(feodo_files, parse_feodo_snapshot))
  tf    <- bind_rows(lapply(tf_files,    parse_threatfox_snapshot))
  bind_rows(feodo, tf)
}

# ---- Assembly ---------------------------------------------------------------

build_cybersecurity <- function() {
  snapshots <- read_all_snapshots()

  geo_path <- file.path(CYBER_CACHE, "ip_geolocation.csv")
  geo <- if (file.exists(geo_path)) {
    read_csv(geo_path, show_col_types = FALSE)
  } else {
    tibble(ip = character(), country = character(), region_name = character(),
           city = character(), lat = numeric(), lon = numeric(),
           as_name = character())
  }

  enriched <- snapshots |>
    left_join(geo |> select(ip, country, region_name, city, lat, lon, geo_as = as_name),
              by = "ip") |>
    mutate(
      country = coalesce(country,
                         # fall back on feed-reported country code expanded
                         country_feed),
      as_name = coalesce(as_name, geo_as)
    )

  latest_date <- if (nrow(snapshots) > 0) max(snapshots$snapshot_date) else Sys.Date()

  current_threats <- enriched |>
    filter(snapshot_date == latest_date) |>
    select(snapshot_date, source, ip, port, status, malware_family,
           country, region_name, city, lat, lon, as_name,
           first_seen, last_online)
  write_csv(current_threats, file.path(CYBER_DIR, "current_threats.csv"))

  current_botnets <- current_threats |>
    filter(source == "FeodoTracker")
  write_csv(current_botnets, file.path(CYBER_DIR, "current_botnets.csv"))

  province_daily <- enriched |>
    filter(!is.na(country), !is.na(region_name), nzchar(region_name)) |>
    group_by(snapshot_date, source, country, region_name) |>
    summarize(n = n_distinct(ip), .groups = "drop") |>
    arrange(desc(snapshot_date), desc(n))
  write_csv(province_daily, file.path(CYBER_DIR, "province_daily.csv"))

  malware_daily <- enriched |>
    filter(!is.na(malware_family), nzchar(malware_family)) |>
    group_by(snapshot_date, source, malware_family) |>
    summarize(n = n_distinct(ip), .groups = "drop") |>
    arrange(desc(snapshot_date), desc(n))
  write_csv(malware_daily, file.path(CYBER_DIR, "malware_family_daily.csv"))

  summary_tbl <- tibble(
    as_of                 = latest_date,
    sources_active        = n_distinct(enriched$source[enriched$snapshot_date == latest_date]),
    total_ips_today       = n_distinct(current_threats$ip),
    total_botnet_ips_today = n_distinct(current_botnets$ip),
    countries_today       = n_distinct(na.omit(current_threats$country)),
    provinces_today       = n_distinct(
      paste0(current_threats$country, "|", current_threats$region_name)[
        !is.na(current_threats$region_name) & nzchar(current_threats$region_name)]),
    top_malware_today     = {
      m <- sort(table(current_threats$malware_family[!is.na(current_threats$malware_family) &
                                                       nzchar(current_threats$malware_family)]),
                decreasing = TRUE)
      if (length(m) > 0) names(m)[1] else NA_character_
    },
    snapshots_accumulated = length(unique(snapshots$snapshot_date))
  )
  write_csv(summary_tbl, file.path(CYBER_DIR, "threats_summary.csv"))

  cat(sprintf("build_cybersecurity: %d IPs today (%d botnet), %d provinces, %d snapshots accumulated\n",
              summary_tbl$total_ips_today, summary_tbl$total_botnet_ips_today,
              summary_tbl$provinces_today, summary_tbl$snapshots_accumulated))
  invisible(NULL)
}
