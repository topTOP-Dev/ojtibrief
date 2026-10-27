/* Data model: in-flight ring timings + phase tables, defaults, localStorage,
 * and the defaults.md file that overrides the built-in defaults at startup. */

/** `ttt` = time remaining to touchdown (s) when the aircraft is at `nm`. */
export interface Timing {
  nm: number;
  ttt: number;
}

export interface Phase {
  id: string;
  label: string;
  duration: number; // seconds
}

/* ---- In-flight timings ----
 * Seeded at ~0.2 min/NM (~300 kt), matching the anchors 80NM->16:00 and 60NM->12:00. */

const TIMINGS_KEY = "ojtibrief.timings";

export const DEFAULT_TIMINGS: Timing[] = [
  { nm: 80, ttt: 960 },
  { nm: 60, ttt: 720 },
  { nm: 40, ttt: 480 },
  { nm: 25, ttt: 300 },
  { nm: 20, ttt: 240 },
  { nm: 10, ttt: 120 },
  { nm: 7, ttt: 84 },
  { nm: 5, ttt: 60 },
];

// Outer scope edge (used for scaling the Local scope).
export const SCOPE_RANGE_NM = 100;

// Zoomed scope edge for the correlation views (Mix Mode, A-D-A, Circuit, Overhead).
export const COMPARE_SCOPE_RANGE_NM = 40;

export function cloneTimingDefaults(): Timing[] {
  return DEFAULT_TIMINGS.map((r) => ({ nm: r.nm, ttt: r.ttt }));
}

function isValidTimings(arr: unknown): arr is Timing[] {
  if (!Array.isArray(arr) || arr.length !== DEFAULT_TIMINGS.length) return false;
  return arr.every((r, i) =>
    r && r.nm === DEFAULT_TIMINGS[i].nm &&
    typeof r.ttt === "number" && isFinite(r.ttt) && r.ttt >= 0);
}

export function loadTimings(): Timing[] {
  try {
    const raw = localStorage.getItem(TIMINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidTimings(parsed)) return parsed.map((r) => ({ nm: r.nm, ttt: r.ttt }));
    }
  } catch { /* fall through to defaults */ }
  return cloneTimingDefaults();
}

export function saveTimings(arr: Timing[]): void {
  try { localStorage.setItem(TIMINGS_KEY, JSON.stringify(arr)); } catch { /* storage blocked */ }
}

/* ---- Phase tables (ground, circuit, overhead break) ----
 * Stored arrays must match the default ids in order; anything else falls back
 * to defaults. Labels always come from the defaults. */

export interface PhaseStore {
  defaults: Phase[];
  clone(): Phase[];
  load(): Phase[];
  save(arr: Phase[]): void;
}

function phaseStore(key: string, defaults: Phase[]): PhaseStore {
  const clone = () => defaults.map((p) => ({ id: p.id, label: p.label, duration: p.duration }));
  const isValid = (arr: unknown): arr is Phase[] =>
    Array.isArray(arr) && arr.length === defaults.length &&
    arr.every((p, i) =>
      p && p.id === defaults[i].id &&
      typeof p.duration === "number" && isFinite(p.duration) && p.duration >= 0);
  return {
    defaults,
    clone,
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isValid(parsed)) {
            return parsed.map((p, i) => ({ id: p.id, label: defaults[i].label, duration: p.duration }));
          }
        }
      } catch { /* fall through */ }
      return clone();
    },
    save(arr) {
      try { localStorage.setItem(key, JSON.stringify(arr)); } catch { /* storage blocked */ }
    },
  };
}

/** Ground departure at VTCC, push back to rolling. TWY P is the parallel taxiway. */
export const groundStore = phaseStore("ojtibrief.ground.v2", [
  { id: "pushback",    label: "Start Push → Push Complete",     duration: 180 },
  { id: "taxi",        label: "Start Taxi → TWY P",             duration: 60 },
  { id: "twy_p_f",     label: "TWY P → TWY F",                  duration: 60 },
  { id: "twy_f_hp",    label: "TWY F → Holding Point",          duration: 60 },
  { id: "hp_lineup",   label: "Holding Point → Line Up",        duration: 120 },
  { id: "lineup_roll", label: "Line Up → Rolling for Take-off", duration: 60 },
]);

/** Right-hand training circuit, RWY 36 (touch-and-go). */
export const circuitStore = phaseStore("ojtibrief.circuit.v2", [
  { id: "upwind",    label: "Upwind → Crosswind",   duration: 60 },
  { id: "crosswind", label: "Crosswind → Downwind", duration: 60 },
  { id: "downwind",  label: "Downwind → Base",      duration: 60 },
  { id: "base",      label: "Base → Final",         duration: 45 },
  { id: "final",     label: "Final → Touchdown",    duration: 60 },
  { id: "touchdown", label: "Touchdown → Upwind",   duration: 30 },
]);

/** Military overhead break (initial → break → land). */
export const breakStore = phaseStore("ojtibrief.break", [
  { id: "initial", label: "Initial → Break", duration: 60 },
  { id: "turn180", label: "180° Turn",       duration: 120 },
  { id: "base",    label: "Base Leg",        duration: 30 },
  { id: "landing", label: "Landing",         duration: 60 },
]);

/** Inbound range `nm` when the pattern aircraft is `frac` of the way through
 * phase `id` (0 = phase start). */
export interface PatternAnchor { id: string; nm: number; frac?: number }
// Inbound range when the circuit aircraft is midway along downwind.
export const CIRCUIT_ANCHOR: PatternAnchor = { id: "downwind", nm: 20, frac: 0.5 };
// Inbound range when the jet crosses the break point (start of the 180° turn).
export const BREAK_ANCHOR: PatternAnchor = { id: "turn180", nm: 20 };

/* ---- Time helpers ---- */

/** Seconds -> "m:ss" */
export function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** "mm:ss" (or plain seconds) -> seconds; NaN when unparseable. */
export function parseMMSS(str: string): number {
  const m = String(str).trim().match(/^(\d+)(?::(\d{1,2}))?$/);
  if (!m) return NaN;
  return m[2] === undefined ? parseInt(m[1], 10) : parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Seconds elapsed before phase `idx` starts. */
export function phaseStart(phases: Phase[], idx: number): number {
  let e = 0;
  for (let i = 0; i < idx; i++) e += phases[i].duration;
  return e;
}

export function totalDuration(phases: { duration: number }[]): number {
  return phases.reduce((sum, p) => sum + p.duration, 0);
}

/** Time to touchdown at range `nm`, interpolated between rings. */
export function interpolateTTT(timings: Timing[], nm: number): number {
  if (nm >= timings[0].nm) return timings[0].ttt;
  if (nm <= 0) return 0;
  const last = timings[timings.length - 1];
  if (nm <= last.nm) return last.ttt * (nm / last.nm);
  for (let i = 0; i < timings.length - 1; i++) {
    if (nm <= timings[i].nm && nm >= timings[i + 1].nm) {
      const frac = (timings[i].nm - nm) / (timings[i].nm - timings[i + 1].nm);
      return timings[i].ttt + frac * (timings[i + 1].ttt - timings[i].ttt);
    }
  }
  return 0;
}

/** Range at a given time to touchdown (inverse of interpolateTTT). */
export function tttToNM(timings: Timing[], ttt: number): number {
  if (ttt <= 0) return 0;
  if (ttt >= timings[0].ttt) return timings[0].nm * (ttt / timings[0].ttt);
  for (let i = 0; i < timings.length - 1; i++) {
    if (ttt <= timings[i].ttt && ttt >= timings[i + 1].ttt) {
      const span = timings[i].ttt - timings[i + 1].ttt;
      const frac = span === 0 ? 0 : (timings[i].ttt - ttt) / span;
      return timings[i].nm - frac * (timings[i].nm - timings[i + 1].nm);
    }
  }
  const last = timings[timings.length - 1];
  return last.ttt <= 0 ? 0 : last.nm * (ttt / last.ttt);
}

/* ---- Default durations file (defaults.md) ----
 * Markdown tables, one `## ` section per data set. Loaded at startup to
 * override the built-in defaults; lives in public/ so it is served as-is. */

export const DEFAULTS_FILE = "defaults.md";

export interface DurationData {
  timings: Timing[];
  ground: Phase[];
  circuit: Phase[];
  break: Phase[];
}

const PHASE_SECTIONS: { heading: string; key: keyof Omit<DurationData, "timings">; store: PhaseStore }[] = [
  { heading: "Ground Phases",  key: "ground",  store: groundStore },
  { heading: "Circuit Phases", key: "circuit", store: circuitStore },
  { heading: "Break Phases",   key: "break",   store: breakStore },
];
const TIMINGS_HEADING = "In-flight Timings";

export function durationsToMarkdown(data: DurationData): string {
  let out = "# Default Durations\n\n" +
    "Loaded by the app at startup as the defaults. Edit the mm:ss column, or use\n" +
    "\"Save as default file\" on the Config tab (open the site with ?instructor=1)\n" +
    "to regenerate this file. It lives in public/defaults.md.\n";
  out += "\n## " + TIMINGS_HEADING + "\n\n| NM | To touchdown (mm:ss) |\n|---:|---:|\n";
  data.timings.forEach((r) => { out += "| " + r.nm + " | " + formatMMSS(r.ttt) + " |\n"; });
  PHASE_SECTIONS.forEach((sec) => {
    out += "\n## " + sec.heading + "\n\n| id | Phase | Duration (mm:ss) |\n|---|---|---:|\n";
    data[sec.key].forEach((p) => { out += "| " + p.id + " | " + p.label + " | " + formatMMSS(p.duration) + " |\n"; });
  });
  return out;
}

/** Parses defaults.md and writes matching values into the built-in defaults.
 * Rows are matched by NM / id; unknown or invalid rows are ignored. */
export function applyDefaultsMarkdown(text: string): void {
  text.split(/^##\s+/m).slice(1).forEach((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const heading = lines[0].trim().toLowerCase();
    const isTimings = heading === TIMINGS_HEADING.toLowerCase();
    const sec = PHASE_SECTIONS.find((s) => s.heading.toLowerCase() === heading);
    if (!isTimings && !sec) return;
    lines.slice(1).forEach((line) => {
      if (!/^\s*\|/.test(line)) return;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 2) return;
      const secs = parseMMSS(cells[cells.length - 1]);
      if (!isFinite(secs) || secs < 0) return;
      if (isTimings) {
        const row = DEFAULT_TIMINGS.find((r) => String(r.nm) === cells[0]);
        if (row) row.ttt = secs;
      } else {
        const row = sec!.store.defaults.find((p) => p.id === cells[0]);
        if (row) row.duration = secs;
      }
    });
  });
}

/** Copies `data` values into the built-in defaults so "Reset to defaults" uses them. */
export function setBuiltInDefaults(data: DurationData): void {
  DEFAULT_TIMINGS.forEach((r, i) => { r.ttt = data.timings[i].ttt; });
  PHASE_SECTIONS.forEach((sec) => {
    sec.store.defaults.forEach((p, i) => { p.duration = data[sec.key][i].duration; });
  });
}

/** Fetches defaults.md and applies it. Resolves true when applied. */
export function loadDefaultsFile(): Promise<boolean> {
  return fetch(DEFAULTS_FILE, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    })
    .then((text) => { applyDefaultsMarkdown(text); return true; })
    .catch(() => false);
}
