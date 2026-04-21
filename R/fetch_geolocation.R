# -----------------------------------------------------------------------------
# fetch_geolocation.R
#
# Incremental IP→geolocation cache using ip-api.com's free batch endpoint.
#
# Input:  a character vector of IPs to resolve.
# Output: persistent cache at data/cybersecurity/cache/ip_geolocation.csv
#         with columns:
#           ip, country, country_code, region_code, region_name, city,
#           lat, lon, as_name, first_seen
#
# Only UNSEEN IPs are looked up; repeated IPs reuse the cached geolocation.
#
# Rate limits (ip-api.com free):
#   - 45 requests / minute
#   - Up to 100 IPs per batch request
# We sleep 2 seconds between batches (~30 batches/min, well under 45).
#
# License: ip-api.com free tier is non-commercial only. Attribution required
# on pages that display the enriched data.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
  library(jsonlite)
  library(httr2)
})

PROJECT_ROOT <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
GEO_CACHE    <- file.path(PROJECT_ROOT, "data", "cybersecurity", "cache",
                          "ip_geolocation.csv")
dir.create(dirname(GEO_CACHE), recursive = TRUE, showWarnings = FALSE)

IPAPI_BATCH <- "http://ip-api.com/batch?fields=status,query,country,countryCode,region,regionName,city,lat,lon,as"
BATCH_SIZE  <- 100
BATCH_SLEEP <- 2

load_geo_cache <- function() {
  if (!file.exists(GEO_CACHE)) {
    return(tibble(ip = character(), country = character(),
                  country_code = character(), region_code = character(),
                  region_name = character(), city = character(),
                  lat = numeric(), lon = numeric(),
                  as_name = character(), first_seen = as.Date(character())))
  }
  read_csv(GEO_CACHE, show_col_types = FALSE,
           col_types = cols(
             ip = col_character(), country = col_character(),
             country_code = col_character(), region_code = col_character(),
             region_name = col_character(), city = col_character(),
             lat = col_double(), lon = col_double(),
             as_name = col_character(), first_seen = col_date()))
}

save_geo_cache <- function(cache) {
  write_csv(cache, GEO_CACHE)
}

geolocate_batch <- function(ips) {
  if (length(ips) == 0) return(tibble())
  body <- jsonlite::toJSON(ips, auto_unbox = FALSE)

  resp <- tryCatch(
    request(IPAPI_BATCH) |>
      req_method("POST") |>
      req_headers(`Content-Type` = "application/json") |>
      req_body_raw(body) |>
      req_user_agent("samcaldwell.info-research/1.0 (non-commercial)") |>
      req_timeout(60) |>
      req_retry(max_tries = 3, backoff = \(n) 10 * n) |>
      req_perform() |>
      resp_body_json(simplifyVector = FALSE),
    error = function(e) {
      warning("  [geo] batch failed: ", conditionMessage(e), call. = FALSE)
      NULL
    }
  )
  if (is.null(resp)) return(tibble())

  rows <- lapply(resp, function(x) {
    if (is.null(x$status) || x$status != "success") {
      tibble(ip = x$query %||% NA_character_)
    } else {
      tibble(
        ip           = x$query       %||% NA_character_,
        country      = x$country     %||% NA_character_,
        country_code = x$countryCode %||% NA_character_,
        region_code  = x$region      %||% NA_character_,
        region_name  = x$regionName  %||% NA_character_,
        city         = x$city        %||% NA_character_,
        lat          = as.numeric(x$lat %||% NA),
        lon          = as.numeric(x$lon %||% NA),
        as_name      = x$as          %||% NA_character_
      )
    }
  })
  bind_rows(rows)
}

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0) b else a

geolocate_ips <- function(ips) {
  ips <- unique(stats::na.omit(as.character(ips)))
  ips <- ips[nzchar(ips)]
  if (length(ips) == 0) return(load_geo_cache())

  cache <- load_geo_cache()
  new_ips <- setdiff(ips, cache$ip)
  if (length(new_ips) == 0) {
    message("  [geo] cache covers all IPs; nothing to look up")
    return(cache)
  }

  message(sprintf("  [geo] resolving %d new IPs in %d batches",
                  length(new_ips),
                  ceiling(length(new_ips) / BATCH_SIZE)))

  new_rows <- list()
  batches  <- split(new_ips, ceiling(seq_along(new_ips) / BATCH_SIZE))
  for (i in seq_along(batches)) {
    res <- geolocate_batch(batches[[i]])
    if (nrow(res) > 0) {
      res$first_seen <- Sys.Date()
      new_rows[[length(new_rows) + 1]] <- res
    }
    if (i < length(batches)) Sys.sleep(BATCH_SLEEP)
  }

  new_df <- bind_rows(new_rows)
  if (nrow(new_df) == 0) return(cache)

  merged <- bind_rows(cache, new_df) |>
    distinct(ip, .keep_all = TRUE) |>
    arrange(ip)
  save_geo_cache(merged)
  message(sprintf("  [geo] cache now %d IPs (+%d new)",
                  nrow(merged), nrow(new_df)))
  merged
}
