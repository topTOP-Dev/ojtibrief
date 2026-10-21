/* Data model: timing per range ring + localStorage persistence.
 * `ttt` = time remaining to touchdown, in seconds, when the aircraft is at `nm`.
 * Seeded at ~0.2 min/NM (~300 kt), matching the anchors 80NM->16:00 and 60NM->12:00. */

const STORAGE_KEY = "ojtibrief.timings";

const DEFAULT_TIMINGS = [
  { nm: 80, ttt: 960 },
  { nm: 60, ttt: 720 },
  { nm: 40, ttt: 480 },
  { nm: 25, ttt: 300 },
  { nm: 20, ttt: 240 },
  { nm: 10, ttt: 120 },
  { nm: 7,  ttt: 84  },
  { nm: 5,  ttt: 60  },
];

// Outer scope edge (not configurable, used for scaling).
const SCOPE_RANGE_NM = 100;

// Zoomed scope edge for the correlation views (Mix Mode, A-D-A, Circuit, Overhead).
const COMPARE_SCOPE_RANGE_NM = 40;

function cloneDefaults() {
  return DEFAULT_TIMINGS.map((r) => ({ nm: r.nm, ttt: r.ttt }));
}

/* Returns true when `arr` is a valid timings array matching the default rings. */
function isValidTimings(arr) {
  if (!Array.isArray(arr) || arr.length !== DEFAULT_TIMINGS.length) return false;
  return arr.every((r, i) =>
    r &&
    r.nm === DEFAULT_TIMINGS[i].nm &&
    typeof r.ttt === "number" &&
    isFinite(r.ttt) &&
    r.ttt >= 0
  );
}

function loadTimings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidTimings(parsed)) {
        return parsed.map((r) => ({ nm: r.nm, ttt: r.ttt }));
      }
    }
  } catch (e) {
    /* fall through to defaults */
  }
  return cloneDefaults();
}

function saveTimings(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* Seconds -> "mm:ss" */
function formatMMSS(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m + ":" + String(rem).padStart(2, "0");
}

/* ---- Ground phases (departure sequence at VTCC) ---- */

const GROUND_STORAGE_KEY = "ojtibrief.ground";

const DEFAULT_GROUND_PHASES = [
  { id: "pushback",  label: "Push Back",             duration: 180 },
  { id: "taxi",      label: "Starting Taxi",         duration: 60  },
  { id: "twy_f",     label: "Taxi Passing TWY F",    duration: 180 },
  { id: "holding",   label: "At Holding Point",      duration: 120 },
  { id: "lineup",    label: "Line Up on Runway",     duration: 60  },
  { id: "rolling",   label: "Rolling for Take-off",  duration: 30  },
];

function cloneGroundDefaults() {
  return DEFAULT_GROUND_PHASES.map((p) => ({ id: p.id, label: p.label, duration: p.duration }));
}

function isValidGroundPhases(arr) {
  if (!Array.isArray(arr) || arr.length !== DEFAULT_GROUND_PHASES.length) return false;
  return arr.every((p, i) =>
    p &&
    p.id === DEFAULT_GROUND_PHASES[i].id &&
    typeof p.duration === "number" &&
    isFinite(p.duration) &&
    p.duration >= 0
  );
}

function loadGroundPhases() {
  try {
    const raw = localStorage.getItem(GROUND_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidGroundPhases(parsed)) {
        return parsed.map((p, i) => ({
          id: p.id,
          label: DEFAULT_GROUND_PHASES[i].label,
          duration: p.duration,
        }));
      }
    }
  } catch (e) {
    /* fall through to defaults */
  }
  return cloneGroundDefaults();
}

function saveGroundPhases(arr) {
  localStorage.setItem(GROUND_STORAGE_KEY, JSON.stringify(arr));
}

/* ---- Traffic circuit phases (training pattern at VTCC) ---- */

const CIRCUIT_STORAGE_KEY = "ojtibrief.circuit";
const CIRCUIT_ANCHOR_NM = 15;

const DEFAULT_CIRCUIT_PHASES = [
  { id: "downwind",  label: "Downwind Leg",  duration: 60 },
  { id: "base",      label: "Base Leg",      duration: 60 },
  { id: "final",     label: "Final Leg",     duration: 60 },
  { id: "upwind",    label: "Upwind Leg",    duration: 60 },
  { id: "crosswind", label: "Crosswind Leg", duration: 60 },
];

function cloneCircuitDefaults() {
  return DEFAULT_CIRCUIT_PHASES.map(function (p) {
    return { id: p.id, label: p.label, duration: p.duration };
  });
}

function isValidCircuitPhases(arr) {
  if (!Array.isArray(arr) || arr.length !== DEFAULT_CIRCUIT_PHASES.length) return false;
  return arr.every(function (p, i) {
    return p &&
      p.id === DEFAULT_CIRCUIT_PHASES[i].id &&
      typeof p.duration === "number" &&
      isFinite(p.duration) &&
      p.duration >= 0;
  });
}

function loadCircuitPhases() {
  try {
    var raw = localStorage.getItem(CIRCUIT_STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (isValidCircuitPhases(parsed)) {
        return parsed.map(function (p, i) {
          return { id: p.id, label: DEFAULT_CIRCUIT_PHASES[i].label, duration: p.duration };
        });
      }
    }
  } catch (e) { /* fall through */ }
  return cloneCircuitDefaults();
}

function saveCircuitPhases(arr) {
  localStorage.setItem(CIRCUIT_STORAGE_KEY, JSON.stringify(arr));
}

/* ---- Military overhead-break phases (initial → break → land at VTCC) ---- */

const BREAK_STORAGE_KEY = "ojtibrief.break";
const BREAK_ANCHOR_NM = 20;

const DEFAULT_BREAK_PHASES = [
  { id: "initial", label: "Initial → Break", duration: 60 },
  { id: "turn180", label: "180° Turn",       duration: 120 },
  { id: "base",    label: "Base Leg",        duration: 30 },
  { id: "landing", label: "Landing",         duration: 60 },
];

function cloneBreakDefaults() {
  return DEFAULT_BREAK_PHASES.map(function (p) {
    return { id: p.id, label: p.label, duration: p.duration };
  });
}

function isValidBreakPhases(arr) {
  if (!Array.isArray(arr) || arr.length !== DEFAULT_BREAK_PHASES.length) return false;
  return arr.every(function (p, i) {
    return p &&
      p.id === DEFAULT_BREAK_PHASES[i].id &&
      typeof p.duration === "number" &&
      isFinite(p.duration) &&
      p.duration >= 0;
  });
}

function loadBreakPhases() {
  try {
    var raw = localStorage.getItem(BREAK_STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (isValidBreakPhases(parsed)) {
        return parsed.map(function (p, i) {
          return { id: p.id, label: DEFAULT_BREAK_PHASES[i].label, duration: p.duration };
        });
      }
    }
  } catch (e) { /* fall through */ }
  return cloneBreakDefaults();
}

function saveBreakPhases(arr) {
  localStorage.setItem(BREAK_STORAGE_KEY, JSON.stringify(arr));
}

/* ---- Default durations file (defaults.md) ----
 * Markdown tables, one `## ` section per data set. Loaded at startup to
 * override the built-in DEFAULT_* values; requires a web server (fetch). */

const DEFAULTS_FILE = "defaults.md";

const DEFAULTS_SECTIONS = [
  { heading: "In-flight Timings", key: "nm",  field: "ttt",      list: DEFAULT_TIMINGS },
  { heading: "Ground Phases",     key: "id",  field: "duration", list: DEFAULT_GROUND_PHASES },
  { heading: "Circuit Phases",    key: "id",  field: "duration", list: DEFAULT_CIRCUIT_PHASES },
  { heading: "Break Phases",      key: "id",  field: "duration", list: DEFAULT_BREAK_PHASES },
];

/* "mm:ss" (or plain seconds) -> seconds; NaN when unparseable. */
function parseMMSS(str) {
  const m = String(str).trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  if (!m) return NaN;
  return m[2] === undefined ? parseInt(m[1], 10) : parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/* Builds defaults.md text from data sets in DEFAULTS_SECTIONS order:
 * { timings, ground, circuit, break } */
function durationsToMarkdown(data) {
  const sets = [data.timings, data.ground, data.circuit, data.break];
  let out = "# Default Durations\n\n" +
    "Loaded by the app at startup as the defaults. Edit the mm:ss column, or use\n" +
    "\"Save as default file\" on the Config tab to regenerate this file.\n";
  DEFAULTS_SECTIONS.forEach((sec, i) => {
    out += "\n## " + sec.heading + "\n\n";
    if (sec.key === "nm") {
      out += "| NM | To touchdown (mm:ss) |\n|---:|---:|\n";
      sets[i].forEach((r) => { out += "| " + r.nm + " | " + formatMMSS(r.ttt) + " |\n"; });
    } else {
      out += "| id | Phase | Duration (mm:ss) |\n|---|---|---:|\n";
      sets[i].forEach((p) => { out += "| " + p.id + " | " + p.label + " | " + formatMMSS(p.duration) + " |\n"; });
    }
  });
  return out;
}

/* Parses defaults.md and writes matching values into the DEFAULT_* arrays.
 * Rows are matched by NM / id; unknown or invalid rows are ignored. */
function applyDefaultsMarkdown(text) {
  const chunks = text.split(/^##\s+/m).slice(1);
  chunks.forEach((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const sec = DEFAULTS_SECTIONS.find((s) => s.heading.toLowerCase() === lines[0].trim().toLowerCase());
    if (!sec) return;
    lines.slice(1).forEach((line) => {
      if (!/^\s*\|/.test(line)) return;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 2) return;
      const secs = parseMMSS(cells[cells.length - 1]);
      if (!isFinite(secs) || secs < 0) return;
      const row = sec.list.find((r) => String(r[sec.key]) === cells[0]);
      if (row) row[sec.field] = secs;
    });
  });
}

/* Fetches defaults.md and applies it. Resolves true when applied. */
function loadDefaultsFile() {
  return fetch(DEFAULTS_FILE, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then((text) => { applyDefaultsMarkdown(text); return true; })
    .catch(() => false);
}
