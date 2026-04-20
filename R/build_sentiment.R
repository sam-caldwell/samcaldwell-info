# -----------------------------------------------------------------------------
# build_sentiment.R
#
# Assembles three public-sentiment views into per-admin summaries:
#
#   (B) Political approval — hand-curated from Gallup per-admin averages in
#       data/sentiment/gallup_approval.csv. Approval polling is not available
#       via a free API; this file is maintained by hand.
#
#   (A) Economic sentiment — U. Michigan Consumer Sentiment Index (FRED series
#       `UMCSENT`, monthly, public-domain). Sliced by the admin in office at
#       month mid-point, using the same rule as the presidential-economies
#       analysis.
#
#   (C) Media sentiment — placeholder. Modern news-tone APIs (GDELT, etc.)
#       require build complexity or commercial licensing; see the
#       /sentiment/media/ page for what this would show with a licensed feed.
#
# Output:
#   data/sentiment/umcsent_monthly.csv       (tagged by admin)
#   data/sentiment/admin_sentiment.csv       (per-admin aggregates)
#   # gallup_approval.csv and events.csv are authored by hand and passed
#   # through unchanged.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(lubridate)
  library(tibble)
})

build_sentiment <- function() {
  project_root <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
  cache_dir    <- file.path(project_root, "data", "economy", "cache")
  sent_dir     <- file.path(project_root, "data", "sentiment")
  dir.create(sent_dir, recursive = TRUE, showWarnings = FALSE)

  # ---- (A) UMCSENT -----------------------------------------------------------
  umcsent_cache <- file.path(cache_dir, "umcsent.csv")
  umcsent <- if (file.exists(umcsent_cache)) {
    read_csv(umcsent_cache, show_col_types = FALSE,
             col_types = cols(date = col_date(), value = col_double()))
  } else {
    warning("UMCSENT cache missing — run R/fetch_fred.R first or use synthetic.")
    tibble(date = as.Date(character()), value = numeric())
  }

  # Reuse the admin reference table from presidential-economies for consistent
  # mid-month tagging.
  admins_path <- file.path(project_root, "data", "presidential-economies", "administrations.csv")
  if (!file.exists(admins_path)) {
    stop("administrations.csv not found — build_presidential() must run first.", call. = FALSE)
  }
  admins <- read_csv(admins_path, show_col_types = FALSE) |>
    mutate(start_date    = as.Date(start_date),
           effective_end = as.Date(effective_end))

  tag_admin <- function(d) {
    idx <- which(d >= admins$start_date & d < admins$effective_end)
    if (length(idx) == 0) NA_integer_ else idx[1]
  }

  umcsent_tagged <- umcsent |>
    filter(!is.na(value), date >= as.Date("1999-01-01")) |>
    mutate(mid_month = date + 13) |>
    mutate(admin_idx = vapply(mid_month, tag_admin, integer(1))) |>
    filter(!is.na(admin_idx)) |>
    mutate(
      president = admins$president[admin_idx],
      party     = admins$party[admin_idx],
      ongoing   = admins$ongoing[admin_idx]
    ) |>
    rename(umcsent = value) |>
    select(date, umcsent, president, party, ongoing)

  write_csv(umcsent_tagged, file.path(sent_dir, "umcsent_monthly.csv"))

  umcsent_baseline <- round(mean(umcsent_tagged$umcsent, na.rm = TRUE), 1)

  umcsent_by_admin <- umcsent_tagged |>
    group_by(president, party, ongoing) |>
    summarize(
      umcsent_avg = round(mean(umcsent, na.rm = TRUE), 1),
      umcsent_min = round(min(umcsent,  na.rm = TRUE), 1),
      umcsent_max = round(max(umcsent,  na.rm = TRUE), 1),
      months      = n(),
      .groups = "drop"
    ) |>
    mutate(umcsent_vs_baseline = round(umcsent_avg - umcsent_baseline, 1))

  # ---- (B) Gallup approval ---------------------------------------------------
  gallup_path <- file.path(sent_dir, "gallup_approval.csv")
  gallup <- read_csv(gallup_path, show_col_types = FALSE,
                     col_types = cols(.default = "?", ongoing = col_logical()))

  gallup_baseline <- round(mean(gallup$avg_approval, na.rm = TRUE), 1)

  gallup_for_join <- gallup |>
    transmute(president, party,
              gallup_avg = avg_approval,
              gallup_min = min_approval,
              gallup_max = max_approval,
              gallup_last = last_approval) |>
    mutate(gallup_vs_baseline = round(gallup_avg - gallup_baseline, 1))

  # ---- Merge per-admin summary ----------------------------------------------
  admin_sentiment <- admins |>
    select(president, party, start_date, end_date, ongoing) |>
    left_join(umcsent_by_admin, by = c("president","party","ongoing")) |>
    left_join(gallup_for_join,  by = c("president","party")) |>
    arrange(start_date)

  # Attach the baselines so the UI can show them without re-aggregating
  attr(admin_sentiment, "umcsent_baseline") <- umcsent_baseline
  attr(admin_sentiment, "gallup_baseline")  <- gallup_baseline

  # Stash baselines inside the CSV too (one extra row with NA president,
  # label 'BASELINE') so consumers can read it directly.
  baseline_row <- tibble(
    president    = "BASELINE (avg of displayed admins)",
    party        = NA_character_,
    umcsent_avg  = umcsent_baseline,
    gallup_avg   = gallup_baseline
  )
  out <- bind_rows(admin_sentiment, baseline_row)

  write_csv(out, file.path(sent_dir, "admin_sentiment.csv"))

  cat(sprintf("build_sentiment: wrote %d admin rows (+ baseline) to %s\n",
              nrow(admin_sentiment), sent_dir))
  invisible(NULL)
}
