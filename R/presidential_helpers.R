# -----------------------------------------------------------------------------
# presidential_helpers.R
#
# Loaders + shared styling for the /presidential-economies/ pages. Expects
# R/helpers.R to have already been sourced (for DATA_ROOT + formatting fns).
# -----------------------------------------------------------------------------

PRESIDENTIAL_DIR <- file.path(DATA_ROOT, "presidential-economies")

load_administrations <- function()
  read_csv(file.path(PRESIDENTIAL_DIR, "administrations.csv"),
           show_col_types = FALSE,
           col_types = cols(.default = "?", ongoing = col_logical()))

load_monthly_admin   <- function()
  read_csv(file.path(PRESIDENTIAL_DIR, "monthly_admin.csv"), show_col_types = FALSE)

load_admin_summary   <- function()
  read_csv(file.path(PRESIDENTIAL_DIR, "admin_summary.csv"),
           show_col_types = FALSE,
           col_types = cols(.default = "?", ongoing = col_logical()))

# Standard US political colors. Used consistently across all pages.
party_colors <- c(
  "Democratic" = "#2a6f97",
  "Republican" = "#bc4749"
)

party_color <- function(party) unname(party_colors[party])

# Short label for chart categories — fits on an x-axis tick
admin_short_label <- function(president, ongoing) {
  short <- recode(
    president,
    "Bill Clinton"              = "Clinton",
    "George W. Bush"            = "Bush (43)",
    "Barack Obama"              = "Obama",
    "Donald Trump (1st term)"   = "Trump I",
    "Joe Biden"                 = "Biden",
    "Donald Trump (2nd term)"   = "Trump II",
    .default = president
  )
  ifelse(ongoing, paste0(short, "*"), short)
}
