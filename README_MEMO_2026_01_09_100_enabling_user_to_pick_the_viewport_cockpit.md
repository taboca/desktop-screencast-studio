# Enabling the user to pick the viewport cockpit memo (2026-01-09)

**Author** — Marcel Galli

**Summary** — We want to allow the user to pick from a selection of different HTML views, rather than locking the viewport to a single cockpit.

**Situation** — The UI currently launches a fixed cockpit view, which makes it hard to compare or switch between different HTML layouts. Gathering information first means listing the available HTML view directories under `public_cockpits` so we know the valid cockpit options.

**Question** — How do we let users choose which cockpit viewport to open?

**Answer / Direction** — Add a simple selection mechanism in the UI (dropdown or list) that routes to the chosen HTML view, so the viewport cockpit is user-selected instead of hard-coded.

## To do activities

* Update the UI so that instead of linking to a single demo, users can pick from the available demos.
* Use a dynamic listing, which may require an endpoint to gather directories from `src/content`.

### Changes

* Replaced the single cockpit link with a selector plus Open button in the main UI.
* Added a directory-listing fetch with a fallback list to populate cockpit options dynamically.
* Updated the cockpit picker UI to use a compact OK button without the ghost-link icon styling.
* Added a small API server to list available cockpit directories and removed the label so only the select + OK button remains.
* Moved demo selection into a new Demos tab with buttons and added a tabbed layout for Demos, Controls, and About.
* Split the UI and demos into `public_content/` and `public_cockpits/`, and updated the API to list only cockpit entries.
* Flattened `public_content` so the main UI lives directly under `public_content/` and updated server/root asset paths.
