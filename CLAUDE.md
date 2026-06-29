# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ATC (Air Traffic Control) radar briefing simulation for OJTI (On-the-Job Training Instructor) use. Simulates inbound aircraft approaching VTCC (Chiang Mai International Airport) with configurable timing, plus a ground departure sequence, and a combined "Mix Mode" view correlating the two.

## Development

No build system, bundler, or package manager. Open `index.html` directly in a browser or serve with any static file server (e.g. `python3 -m http.server`). No tests or linting configured.

## Architecture

All rendering is Canvas 2D. State persists to `localStorage`. The app uses vanilla JS with IIFE module pattern — **script load order in `index.html` matters** because modules reference each other's globals.

Load order and dependencies:
1. `js/config.js` — shared data model, defaults, localStorage read/write, `formatMMSS()`. Everything depends on this.
2. `js/radar.js` — `drawScope()` pure rendering function. Uses `SCOPE_RANGE_NM` and `formatMMSS` from config.
3. `js/sim.js` — `Sim` IIFE. Manages in-flight step state, drives radar canvas and side panel.
4. `js/airport.js` — `drawAirport()` pure rendering function for VTCC ground diagram.
5. `js/ground-sim.js` — `GroundSim` IIFE. Manages ground departure step state, drives airport canvas.
6. `js/compare.js` — `Compare` IIFE. Reads from both `Sim` and `GroundSim`, interpolates in-flight position based on ground elapsed time. Renders side-by-side canvases.
7. `js/app.js` — entry point. Tab switching, config table editors, `DOMContentLoaded` init.

Key data structures:
- **Timings** (in-flight): `[{ nm, ttt }]` — range in nautical miles and seconds to touchdown. 8 rings from 80 NM down to 5 NM.
- **Ground phases**: `[{ id, label, duration }]` — 6 departure phases from push back to rolling for take-off.

The Compare tab maps ground elapsed time to an interpolated in-flight position between 40 NM and 4 NM final.
