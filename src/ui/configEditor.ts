/* Config tab: mm:ss editors for the ring timings and the three phase
 * tables, plus "Save as default file" (defaults.md). Instructor only. */

import {
  DEFAULTS_FILE, breakStore, circuitStore, cloneTimingDefaults, durationsToMarkdown, formatMMSS,
  groundStore, saveTimings, setBuiltInDefaults, type DurationData, type PhaseStore,
} from "../config";
import { byId } from "../core/canvas";
import { onStateChange, reloadState, setState, state } from "../state";

interface Editor {
  key: keyof DurationData;
  rows: () => { label: string; secs: number }[];
  preview: (secs: number) => string;
  save: (secs: number[]) => void;
  reset: () => void;
}

function flash(el: HTMLElement, msg: string, ms = 2000): void {
  el.textContent = msg;
  setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, ms);
}

function build(ed: Editor): void {
  const body = byId("cfg-" + ed.key);
  body.innerHTML = "";
  ed.rows().forEach((row, i) => {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = row.label;
    const min = document.createElement("td");
    const sec = document.createElement("td");
    const prev = document.createElement("td");
    prev.className = "ttt";
    const mkInput = (part: "min" | "sec", value: number) => {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      if (part === "sec") inp.max = "59";
      inp.inputMode = "numeric";
      inp.dataset.idx = String(i);
      inp.dataset.part = part;
      inp.value = String(value);
      inp.setAttribute("aria-label", row.label + (part === "min" ? " minutes" : " seconds"));
      inp.addEventListener("input", () => { prev.textContent = ed.preview(readRow(body, i)); });
      return inp;
    };
    min.appendChild(mkInput("min", Math.floor(row.secs / 60)));
    sec.appendChild(mkInput("sec", row.secs % 60));
    prev.textContent = ed.preview(row.secs);
    tr.append(name, min, sec, prev);
    body.appendChild(tr);
  });
}

function readRow(body: HTMLElement, i: number): number {
  const v = (part: string) =>
    parseInt(body.querySelector<HTMLInputElement>(`input[data-idx="${i}"][data-part="${part}"]`)!.value, 10) || 0;
  return Math.max(0, v("min")) * 60 + Math.max(0, v("sec"));
}

function collect(ed: Editor): number[] {
  const body = byId("cfg-" + ed.key);
  return ed.rows().map((_, i) => readRow(body, i));
}

function phaseEditor(key: "ground" | "circuit" | "break", store: PhaseStore): Editor {
  return {
    key,
    rows: () => state[key].map((p) => ({ label: p.label, secs: p.duration })),
    preview: formatMMSS,
    save(secs) {
      const updated = state[key].map((p, i) => ({ ...p, duration: secs[i] }));
      store.save(updated);
      setState({ [key]: updated });
    },
    reset() {
      const d = store.clone();
      store.save(d);
      setState({ [key]: d });
    },
  };
}

const EDITORS: Editor[] = [
  {
    key: "timings",
    rows: () => state.timings.map((r) => ({ label: String(r.nm), secs: r.ttt })),
    preview: (s) => "T-" + formatMMSS(s),
    save(secs) {
      const updated = state.timings.map((r, i) => ({ nm: r.nm, ttt: secs[i] }));
      saveTimings(updated);
      setState({ timings: updated });
    },
    reset() {
      const d = cloneTimingDefaults();
      saveTimings(d);
      setState({ timings: d });
    },
  },
  phaseEditor("ground", groundStore),
  phaseEditor("circuit", circuitStore),
  phaseEditor("break", breakStore),
];

function writeDefaultsFile(text: string): Promise<void> {
  const w = window as Window & {
    showSaveFilePicker?: (o: object) => Promise<{ createWritable(): Promise<{ write(t: string): Promise<void>; close(): Promise<void> }> }>;
  };
  if (w.showSaveFilePicker) {
    return w.showSaveFilePicker({
      suggestedName: DEFAULTS_FILE,
      types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
    })
      .then((handle) => handle.createWritable())
      .then((f) => f.write(text).then(() => f.close()));
  }
  // Fallback: download, then move it to public/defaults.md manually.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = DEFAULTS_FILE;
  a.click();
  URL.revokeObjectURL(a.href);
  return Promise.resolve();
}

export function initConfigEditor(): void {
  const rebuildAll = () => EDITORS.forEach(build);
  rebuildAll();
  onStateChange(rebuildAll);

  EDITORS.forEach((ed) => {
    const status = document.querySelector<HTMLElement>(`[data-status="${ed.key}"]`)!;
    document.querySelector(`[data-save="${ed.key}"]`)!.addEventListener("click", () => {
      ed.save(collect(ed));
      flash(status, "Saved ✓");
    });
    document.querySelector(`[data-reset="${ed.key}"]`)!.addEventListener("click", () => {
      ed.reset();
      flash(status, "Reset to defaults");
    });
  });

  byId("btn-defaults-file").addEventListener("click", () => {
    const [t, g, c, b] = EDITORS.map(collect);
    const data: DurationData = {
      timings: state.timings.map((r, i) => ({ nm: r.nm, ttt: t[i] })),
      ground: state.ground.map((p, i) => ({ ...p, duration: g[i] })),
      circuit: state.circuit.map((p, i) => ({ ...p, duration: c[i] })),
      break: state.break.map((p, i) => ({ ...p, duration: b[i] })),
    };
    setBuiltInDefaults(data);
    saveTimings(data.timings);
    groundStore.save(data.ground);
    circuitStore.save(data.circuit);
    breakStore.save(data.break);
    reloadState();

    const status = byId("defaults-file-status");
    writeDefaultsFile(durationsToMarkdown(data))
      .then(() => flash(status, "Saved " + DEFAULTS_FILE + " ✓", 3000))
      .catch((e: Error) => { if (e?.name !== "AbortError") flash(status, "Could not save file", 3000); });
  });
}
