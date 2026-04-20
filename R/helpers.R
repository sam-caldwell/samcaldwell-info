# -----------------------------------------------------------------------------
# helpers.R - shared loaders, theme, formatters
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(echarts4r)
  library(htmltools)
  library(scales)
})

DATA_DIR <- file.path(rprojroot::find_root(rprojroot::has_file("_quarto.yml")), "data")

load_annual          <- function() read_csv(file.path(DATA_DIR, "annual.csv"), show_col_types = FALSE)
load_quarterly       <- function() read_csv(file.path(DATA_DIR, "quarterly.csv"), show_col_types = FALSE)
load_monthly         <- function() read_csv(file.path(DATA_DIR, "monthly.csv"), show_col_types = FALSE)
load_gdp_components  <- function() read_csv(file.path(DATA_DIR, "gdp_components.csv"), show_col_types = FALSE)
load_sectors         <- function() read_csv(file.path(DATA_DIR, "sectors.csv"), show_col_types = FALSE)

# --- palette / theme ---------------------------------------------------------

palette_econ <- c(
  growth       = "#2a6f97",
  labor        = "#e07a5f",
  inflation    = "#bc4749",
  rates        = "#6a4c93",
  markets      = "#2f9e44",
  neutral_dark = "#1d3557",
  neutral_mid  = "#6c757d",
  neutral_lite = "#dee2e6",
  positive     = "#2f9e44",
  negative     = "#bc4749",
  recession    = "#000000"
)

# Register a custom ECharts theme once per session
register_econ_theme <- function() {
  echarts4r::e_theme_register(
    '{
      "color": ["#2a6f97","#e07a5f","#bc4749","#6a4c93","#2f9e44","#f2c14e","#1d3557","#6c757d"],
      "backgroundColor": "transparent",
      "textStyle": { "fontFamily": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" },
      "title": { "textStyle": { "fontWeight": "600" } },
      "legend": { "textStyle": { "color": "#495057" } },
      "grid": { "containLabel": true, "left": 48, "right": 24, "top": 56, "bottom": 40 },
      "xAxis": { "axisLine": { "lineStyle": { "color": "#adb5bd" } } },
      "yAxis": { "splitLine": { "lineStyle": { "color": "#e9ecef" } } }
    }',
    name = "econ"
  )
}

# Recession period list (start/end by year-quarter for shading)
recession_periods <- tibble::tribble(
  ~start,           ~end,             ~label,
  as.Date("2001-03-01"), as.Date("2001-11-01"), "Dot-com",
  as.Date("2007-12-01"), as.Date("2009-06-01"), "Global Financial Crisis",
  as.Date("2020-02-01"), as.Date("2020-04-01"), "COVID-19"
)

# Add recession-band mark areas to an echarts4r chart (expects x-axis = Date or year)
add_recession_bands <- function(chart, x_as_year = FALSE) {
  for (i in seq_len(nrow(recession_periods))) {
    p <- recession_periods[i, ]
    xmin <- if (x_as_year) as.integer(format(p$start, "%Y")) else p$start
    xmax <- if (x_as_year) as.integer(format(p$end,   "%Y")) else p$end
    chart <- chart |> e_mark_area(
      data = list(
        list(xAxis = xmin),
        list(xAxis = xmax)
      ),
      itemStyle = list(color = "rgba(0,0,0,0.08)"),
      label     = list(show = FALSE),
      silent    = TRUE
    )
  }
  chart
}

# --- formatters --------------------------------------------------------------

fmt_pct <- function(x, digits = 1) {
  ifelse(is.na(x), NA_character_,
         paste0(formatC(x, format = "f", digits = digits), "%"))
}

fmt_signed_pct <- function(x, digits = 1) {
  out <- fmt_pct(x, digits)
  ifelse(x > 0 & !is.na(x), paste0("+", out), out)
}

# Percentile of 2026 value within the 25-year history
percentile_vs_history <- function(series, current_value) {
  hist <- series[!is.na(series)]
  if (length(hist) == 0) return(NA_real_)
  round(100 * mean(hist <= current_value), 0)
}

# Inline value card component (simple HTML, no extra deps)
value_card <- function(label, value, sublabel = NULL,
                       tone = c("neutral","positive","negative","warn")) {
  tone <- match.arg(tone)
  tone_col <- switch(tone,
    neutral  = "#1d3557",
    positive = "#2f9e44",
    negative = "#bc4749",
    warn     = "#d68102"
  )
  tags$div(
    style = sprintf(
      "border: 1px solid #dee2e6; border-radius: 8px; padding: 14px 16px;
       background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
       min-width: 170px; flex: 1;"
    ),
    tags$div(style = "font-size: 0.80rem; color:#6c757d; letter-spacing: .02em; text-transform: uppercase;", label),
    tags$div(style = sprintf("font-size: 1.7rem; font-weight: 600; color: %s; line-height: 1.15; margin-top: 4px;", tone_col), value),
    if (!is.null(sublabel)) tags$div(style = "font-size: 0.82rem; color:#6c757d; margin-top: 2px;", sublabel)
  )
}

card_row <- function(...) {
  tags$div(
    style = "display:flex; flex-wrap: wrap; gap: 12px; margin: 10px 0 20px;",
    ...
  )
}
