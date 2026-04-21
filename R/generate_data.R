# -----------------------------------------------------------------------------
# generate_data.R
#
# Dispatcher.
#
#   FRED_API_KEY set   → incremental fetch from FRED (public-domain series only)
#                        + synthetic market overlay, written into data/*.csv
#   FRED_API_KEY unset → fully synthetic dataset (local-dev fallback)
#
# The CI workflow always runs with FRED_API_KEY exported. Local contributors
# without a FRED key get the synthetic path automatically.
# -----------------------------------------------------------------------------

root <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))

if (nzchar(Sys.getenv("FRED_API_KEY"))) {
  message("FRED_API_KEY present — building from live FRED cache")
  source(file.path(root, "R", "build_from_fred.R"))
  build_all_from_fred()
} else {
  message("FRED_API_KEY not set — generating synthetic dataset")
  source(file.path(root, "R", "build_synthetic.R"))
  build_synthetic()
}

# Downstream analyses derived from /data/economy/
message("Building presidential-economies dataset")
source(file.path(root, "R", "build_presidential.R"))
build_presidential()

message("Fetching GDELT media tone (may be slow; rate-limited)")
source(file.path(root, "R", "fetch_gdelt.R"))
tryCatch(fetch_gdelt_tone(),
         error = function(e) warning("GDELT fetch failed; continuing without media tone: ",
                                     conditionMessage(e), call. = FALSE))

message("Fetching Media Cloud story volume")
source(file.path(root, "R", "fetch_mediacloud.R"))
tryCatch(fetch_mediacloud_volume(),
         error = function(e) warning("Media Cloud fetch failed; continuing without volume: ",
                                     conditionMessage(e), call. = FALSE))

message("Building sentiment dataset")
source(file.path(root, "R", "build_sentiment.R"))
build_sentiment()

message("Building presidents/legislation/events network graph")
source(file.path(root, "R", "build_network.R"))
tryCatch(build_network(),
         error = function(e) warning("Network build failed: ",
                                     conditionMessage(e), call. = FALSE))

message("Fetching cybersecurity threat feeds")
source(file.path(root, "R", "fetch_threats.R"))
source(file.path(root, "R", "fetch_geolocation.R"))
source(file.path(root, "R", "fetch_cves.R"))
tryCatch({
  fetch_threats_all()

  cyber_cache <- file.path(root, "data", "cybersecurity", "cache")
  source(file.path(root, "R", "build_cybersecurity.R"))
  snaps <- read_all_snapshots()
  if (nrow(snaps) > 0) geolocate_ips(snaps$ip)

  build_cybersecurity()

  # CVE pipeline (independent of threat IP pipeline)
  fetch_cves_all()
  source(file.path(root, "R", "build_cves.R"))
  build_cves()
}, error = function(e) {
  warning("Cybersecurity pipeline failed; continuing without update: ",
          conditionMessage(e), call. = FALSE)
})
