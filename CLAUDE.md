# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ATC (Air Traffic Control) briefing simulator for OJTI (On-the-Job Training Instructor) use at VTCC (Chiang Mai International Airport). Every view is a real-time animation: an inbound on radar, a ground departure, a training circuit, an overhead break, and correlated "Mix Mode" / A-D-A views. Published to GitHub Pages for students.

## Development

Vite + TypeScript (strict), no framework. Node 24.

- `npm run dev` — dev server
- `npm run build` — `tsc --noEmit` then `vite build` into `dist/`
- `npm run preview` — serve the built `dist/`
- `npm run typecheck`

No tests or linting configured. `vite.config.ts` uses `base: "./"`, so the build works under any sub-path (e.g. `/ojtibrief/`). Runtime fetches (`defaults.md`, `briefs/manifest.json`, brief markdown and images) are relative paths served from `public/`.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `master`. Repo Settings → Pages → Source must be **GitHub Actions**. `public/images/` is git-ignored, so brief images are not deployed unless that rule is removed.

## Architecture

All drawing is Canvas 2D in a fixed logical 600×600 space; `setupCanvas()` scales the backing store by `devicePixelRatio`. ES modules, so there is no script load order.

- `src/config.ts` — data model (`Timing`, `Phase`), defaults, `phaseStore()` localStorage persistence, `formatMMSS`/`parseMMSS`, `interpolateTTT`/`tttToNM`, anchors, `defaults.md` read/write.
- `src/state.ts` — live data shared by all views (`state`), `setState`, `onStateChange`, `reloadState`.
- `src/core/player.ts` — `Player`: rAF clock over timed segments (`elapsed`, speed 1–20×, loop, seek, prev/next phase, `phaseAt(t)`). Only the visible view plays; tab switches pause all.
- `src/core/path.ts` — polyline geometry: `pointAlong` (arc-length pose with heading), `smoothCorners`, `arcPoints`, easing.
- `src/core/canvas.ts` — DPR canvas setup, aircraft glyph, data tags, runway, compass.
- `src/draw/*` — pure renderers: `radar.ts` (scope, sweep, trail, target), `radar18.ts` (RWY 18 dog-leg route), `airport.ts` (VTCC ground diagram + `GROUND_ROUTE_36/18`), `circuit.ts`, `breakPattern.ts`.
- `src/views/*` — one controller per view; each builds a `Player`, renders from `onFrame(elapsed)`, and re-times on `onStateChange`. `compare.ts` (Mix Mode 36/18), `pattern.ts` (Circuit + Overhead), `ada.ts` (A-D-A 36/18), `local.ts`, `ground.ts`, `brief.ts` (Brief tab; its tab button is commented out).
- `src/ui/*` — `controls.ts` (player bar), `phaseTable.ts`, `configEditor.ts`, `icons.ts` (Lucide, bundled; static markup uses `<i data-lucide>`).
- `src/main.ts` — entry: instructor mode, tabs (`#hash` deep links), sub-tabs, keyboard (Space, ←/→, Home).

`?instructor=1` reveals the Config tab for the session (`?instructor=0` hides it). Config edits save to that browser's localStorage only; "Save as default file" writes `defaults.md`, which belongs at `public/defaults.md` and is loaded at startup.

## Phase data

- **Timings** (in-flight): `[{ nm, ttt }]`, 8 rings from 80 NM to 5 NM.
- **Ground** (`ojtibrief.ground.v2`): `pushback`, `taxi` (Start Taxi → TWY P), `twy_p_f`, `twy_f_hp`, `hp_lineup`, `lineup_roll`. TWY P is the parallel taxiway. TWY E (just north of the apron connector) is the vacating taxiway; A-D-A arrivals exit there.
- **Circuit** (`ojtibrief.circuit.v2`): `upwind`, `crosswind`, `downwind`, `base`, `final`, `touchdown` (right-hand, RWY 36, touch-and-go).
- **Break**: `initial`, `turn180`, `base`, `landing`.

Stored arrays must match the default ids in order, otherwise the defaults are used. Ground route geometry is keyed by phase id in `GROUND_ROUTE_36/18`; RWY 18 shows `RWY18_LABELS` for the phases that never reach TWY F.

## Correlation anchors

- **Mix Mode RWY 36** (`views/compare.ts`) maps ground elapsed time to arrival range with piecewise (elapsed, NM) anchors keyed to phase ids. Push start = 40 NM, end of `lineup_roll` = 4 NM. Start of `taxi` = 20 NM (RIGTA). Start of `twy_f_hp` (arriving TWY F) = 15 NM.
- **Mix Mode RWY 18** advances cumulative track distance linearly against `RWY18_TOTAL_NM`, down to the 4 NM final.
- **Circuit**: the inbound is at 15 NM at the start of `base`. **Overhead**: 20 NM at the start of `turn180`. Both use `CIRCUIT_ANCHOR`/`BREAK_ANCHOR` in `config.ts`.
- **A-D-A**: each transition lasts as long as ARR2 takes to fly between its step ranges (from the ring timings).
