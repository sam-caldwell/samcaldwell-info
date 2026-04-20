# -----------------------------------------------------------------------------
# build_presidential.R
#
# Derives per-administration summaries from the economy CSVs. Produces:
#   data/presidential-economies/administrations.csv   (reference table)
#   data/presidential-economies/monthly_admin.csv     (monthly data, each row
#                                                     tagged with the president
#                                                     in office mid-month)
#   data/presidential-economies/admin_summary.csv     (per-admin aggregates)
#
# Assignment rule: each calendar month belongs to whichever president was in
# office on the 14th of that month. Inaugurations on Jan 20 → the outgoing
# president "keeps" January; the incoming president's first full month is
# February. This matches the common academic convention.
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(lubridate)
  library(tibble)
})

build_presidential <- function() {
  project_root <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
  economy_dir  <- file.path(project_root, "data", "economy")
  out_dir      <- file.path(project_root, "data", "presidential-economies")
  dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

  monthly <- read_csv(file.path(economy_dir, "monthly.csv"), show_col_types = FALSE)
  annual  <- read_csv(file.path(economy_dir, "annual.csv"),  show_col_types = FALSE)

  today <- Sys.Date()

  admins <- tribble(
    ~president,                 ~party,       ~start_date,   ~end_date,
    "Bill Clinton",             "Democratic", "1993-01-20",  "2001-01-20",
    "George W. Bush",           "Republican", "2001-01-20",  "2009-01-20",
    "Barack Obama",             "Democratic", "2009-01-20",  "2017-01-20",
    "Donald Trump (1st term)",  "Republican", "2017-01-20",  "2021-01-20",
    "Joe Biden",                "Democratic", "2021-01-20",  "2025-01-20",
    "Donald Trump (2nd term)",  "Republican", "2025-01-20",  NA_character_
  ) |>
    mutate(
      start_date    = as.Date(start_date),
      end_date      = as.Date(end_date),
      effective_end = coalesce(end_date, today),
      ongoing       = is.na(end_date),
      duration_days = as.integer(effective_end - start_date)
    )

  write_csv(
    admins |> select(president, party, start_date, end_date, effective_end,
                     ongoing, duration_days),
    file.path(out_dir, "administrations.csv")
  )

  # Assign each month to the president in office on the 14th
  tag_admin <- function(d) {
    idx <- which(d >= admins$start_date & d < admins$effective_end)
    if (length(idx) == 0) NA_integer_ else idx[1]
  }

  monthly_tagged <- monthly |>
    mutate(mid_month = as.Date(date) + 13) |>
    mutate(admin_idx = vapply(mid_month, tag_admin, integer(1))) |>
    filter(!is.na(admin_idx)) |>
    mutate(
      president = admins$president[admin_idx],
      party     = admins$party[admin_idx],
      ongoing   = admins$ongoing[admin_idx]
    ) |>
    select(-admin_idx, -mid_month)

  write_csv(monthly_tagged, file.path(out_dir, "monthly_admin.csv"))

  # Per-admin monthly aggregates
  monthly_stats <- monthly_tagged |>
    arrange(date) |>
    group_by(president, party, ongoing) |>
    summarize(
      window_first = min(date),
      window_last  = max(date),
      months       = n(),
      unemployment_start  = first(unemployment),
      unemployment_end    = last(unemployment),
      unemployment_change = round(last(unemployment) - first(unemployment), 2),
      cpi_avg             = round(mean(cpi, na.rm = TRUE), 2),
      fed_funds_start     = first(fed_funds),
      fed_funds_end       = last(fed_funds),
      fed_funds_change    = round(last(fed_funds) - first(fed_funds), 2),
      ten_year_avg        = round(mean(ten_year, na.rm = TRUE), 2),
      sp500_start_level   = first(sp500_level),
      sp500_end_level     = last(sp500_level),
      vix_avg             = round(mean(vix, na.rm = TRUE), 1),
      .groups = "drop"
    ) |>
    mutate(
      years = pmax(as.numeric(window_last - window_first) / 365.25, 1 / 12),
      sp500_total_return      = round(100 * (sp500_end_level / sp500_start_level - 1), 1),
      sp500_annualized_return = round(100 * ((sp500_end_level / sp500_start_level)^(1 / years) - 1), 1)
    )

  # Per-admin annual GDP growth average (a year belongs to the admin whose
  # term covers July 1 of that year)
  annual_tagged <- annual |>
    mutate(mid_year = as.Date(sprintf("%d-07-01", year)),
           admin_idx = vapply(mid_year, tag_admin, integer(1))) |>
    filter(!is.na(admin_idx)) |>
    mutate(president = admins$president[admin_idx])

  gdp_by_admin <- annual_tagged |>
    group_by(president) |>
    summarize(
      gdp_growth_avg = round(mean(gdp_growth, na.rm = TRUE), 2),
      years_in_data  = n(),
      recession_years = sum(recession == 1, na.rm = TRUE),
      .groups = "drop"
    )

  admin_summary <- admins |>
    select(president, party, start_date, end_date, ongoing) |>
    left_join(monthly_stats, by = c("president","party","ongoing")) |>
    left_join(gdp_by_admin,  by = "president") |>
    arrange(start_date)

  write_csv(admin_summary, file.path(out_dir, "admin_summary.csv"))

  cat(sprintf("build_presidential: wrote 3 CSVs (%d admin rows) to %s\n",
              nrow(admin_summary), out_dir))
  invisible(NULL)
}
