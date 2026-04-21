# -----------------------------------------------------------------------------
# build_network.R
#
# Assembles a single JSON graph describing presidents, legislation, and world
# events for the /sentiment/network page. Consumed by D3 on the client.
#
# Output: data/sentiment/network.json  (one blob with nodes + links)
#
#   nodes[*]:
#     id         — stable key ("pres-clinton", "leg-aca", "evt-911")
#     type       — "president" | "legislation" | "event"
#     label      — display label
#     sentiment  — numeric in [-1, 1] for legislation/events; NA for presidents
#     party      — "Democratic" | "Republican" for presidents; NA otherwise
#     date       — ISO date; NA for presidents (they have a range instead)
#     start_date / end_date — for presidents
#     meta       — extra free-form fields for the tooltip
#
#   links[*]:
#     source, target — node ids
#     role  — "signed" | "in-office" | "supported" | "opposed"
#     weight — numeric 0..1 (line thickness / opacity)
# -----------------------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(jsonlite)
  library(tibble)
  library(lubridate)
  library(stringr)
})

`%||%` <- function(a, b) if (is.null(a) || length(a) == 0 ||
                             (length(a) == 1 && is.na(a))) b else a

build_network <- function() {
  project_root <- rprojroot::find_root(rprojroot::has_file("_quarto.yml"))
  sent_dir     <- file.path(project_root, "data", "sentiment")

  # -- Presidents ------------------------------------------------------------
  admins <- read_csv(file.path(project_root, "data", "presidential-economies",
                               "administrations.csv"),
                     show_col_types = FALSE)

  # Short ID used as node key and as legislation.signed_by / supported_by etc.
  admin_key <- function(president, start_date) {
    nm <- tolower(president)
    nm <- str_replace_all(nm, " ", "")
    nm <- str_replace_all(nm, "[()]", "")
    nm <- str_replace_all(nm, "donaldtrump1stterm", "trump1")
    nm <- str_replace_all(nm, "donaldtrump2ndterm", "trump2")
    nm <- str_replace_all(nm, "georgew\\.bush", "bush43")
    nm <- str_replace_all(nm, "billclinton", "clinton")
    nm <- str_replace_all(nm, "barackobama", "obama")
    nm <- str_replace_all(nm, "joebiden", "biden")
    nm
  }

  pres_nodes <- admins |>
    mutate(key = mapply(admin_key, president, start_date)) |>
    transmute(
      id         = paste0("pres-", key),
      type       = "president",
      label      = president,
      sentiment  = NA_real_,
      party      = party,
      date       = NA_character_,
      start_date = as.character(start_date),
      end_date   = as.character(end_date),
      meta       = paste0("Term ", as.character(start_date),
                          " – ", ifelse(is.na(end_date), "present", as.character(end_date)))
    )

  # Map legislation.signed_by / etc. (stored as short keys) → node IDs
  pres_keys_by_short <- setNames(pres_nodes$id, sub("^pres-", "", pres_nodes$id))

  # -- Events ---------------------------------------------------------------
  events <- read_csv(file.path(sent_dir, "events.csv"), show_col_types = FALSE)

  event_nodes <- events |>
    arrange(date) |>
    mutate(id = sprintf("evt-%03d", row_number())) |>
    transmute(
      id, type = "event",
      label = event,
      sentiment,
      party = NA_character_,
      date = as.character(date),
      start_date = NA_character_, end_date = NA_character_,
      meta = paste0(category, " · severity=", severity)
    )

  # Attribute each event to the president in office on its date
  admin_in_office <- function(d) {
    d <- as.Date(d)
    end_safe <- as.Date(admins$end_date)
    end_safe[is.na(end_safe)] <- Sys.Date() + 1
    idx <- which(d >= as.Date(admins$start_date) & d < end_safe)
    if (length(idx) == 0) NA_integer_ else idx[1]
  }

  event_links <- event_nodes |>
    mutate(aidx = vapply(date, admin_in_office, integer(1))) |>
    filter(!is.na(aidx)) |>
    transmute(
      source = pres_nodes$id[aidx],
      target = id,
      role   = "in-office",
      weight = 0.6
    )

  # -- Legislation ----------------------------------------------------------
  leg <- read_csv(file.path(sent_dir, "legislation.csv"), show_col_types = FALSE)

  legislation_nodes <- leg |>
    transmute(
      id, type = "legislation",
      label = name,
      sentiment,
      party = NA_character_,
      date = as.character(signed_date),
      start_date = NA_character_, end_date = NA_character_,
      meta = paste0(category, " · signed ", signed_date, " · ", short_description)
    )

  # Signed-by links (always present)
  signed_links <- leg |>
    filter(!is.na(signed_by), signed_by %in% names(pres_keys_by_short)) |>
    transmute(
      source = unname(pres_keys_by_short[signed_by]),
      target = id,
      role   = "signed",
      weight = 1.0
    )

  # Supported / opposed links (space- or comma-separated list of keys)
  expand_support <- function(col_name, role_name, weight) {
    src <- leg[[col_name]]
    rows_with_values <- which(!is.na(src) & nzchar(src))
    if (length(rows_with_values) == 0) {
      return(tibble(source = character(), target = character(),
                    role = character(), weight = numeric()))
    }
    out <- list()
    for (i in rows_with_values) {
      ks <- unlist(strsplit(src[i], "[,\\s]+"))
      ks <- ks[nzchar(ks) & ks %in% names(pres_keys_by_short)]
      if (length(ks) == 0) next
      out[[length(out) + 1]] <- tibble(
        source = unname(pres_keys_by_short[ks]),
        target = leg$id[i],
        role   = role_name,
        weight = weight
      )
    }
    if (length(out) == 0) {
      return(tibble(source = character(), target = character(),
                    role = character(), weight = numeric()))
    }
    bind_rows(out)
  }

  supported_links <- expand_support("supported_by", "supported", 0.55)
  opposed_links   <- expand_support("opposed_by",   "opposed",   0.55)

  # -- Assemble --------------------------------------------------------------
  nodes <- bind_rows(pres_nodes, legislation_nodes, event_nodes)
  links <- bind_rows(event_links, signed_links, supported_links, opposed_links) |>
    distinct(source, target, role, .keep_all = TRUE)

  graph <- list(
    meta = list(
      generated_at = as.character(Sys.time()),
      node_counts = list(
        president   = sum(nodes$type == "president"),
        legislation = sum(nodes$type == "legislation"),
        event       = sum(nodes$type == "event")
      ),
      link_counts = as.list(table(links$role))
    ),
    nodes = nodes,
    links = links
  )

  out <- file.path(sent_dir, "network.json")
  write(jsonlite::toJSON(graph, auto_unbox = TRUE, dataframe = "rows",
                         na = "null", pretty = FALSE), out)
  cat(sprintf("build_network: %d nodes (%dP/%dL/%dE), %d links → %s\n",
              nrow(nodes),
              sum(nodes$type == "president"),
              sum(nodes$type == "legislation"),
              sum(nodes$type == "event"),
              nrow(links), basename(out)))
  invisible(NULL)
}
