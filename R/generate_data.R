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
