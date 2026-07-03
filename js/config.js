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
