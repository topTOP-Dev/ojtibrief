/* Tab switching + Config table editor. Entry point. */

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.toggle("active", p.id === "tab-" + tab);
      });
    });
  });
}

/* Sub-tabs within a tab panel (e.g. RWY 36 / RWY 18 in Mix Mode and A-D-A). */
function initSubTabs() {
  document.querySelectorAll(".subtabs").forEach((bar) => {
    const btns = bar.querySelectorAll(".subtab-btn");
    const section = bar.closest(".tab-panel");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.subtab;
        btns.forEach((b) => b.classList.toggle("active", b === btn));
        section.querySelectorAll(".subtab-panel").forEach((p) => {
          p.classList.toggle("active", p.id === "sub-" + target);
        });
      });
    });
  });
}

/* ---- Config editor ---- */

function buildConfigTable(timings) {
  const body = document.getElementById("config-table-body");
  body.innerHTML = "";
  timings.forEach((ring, i) => {
    const mins = Math.floor(ring.ttt / 60);
    const secs = ring.ttt % 60;
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + ring.nm + "</td>" +
      '<td><input type="number" min="0" data-idx="' + i + '" data-part="min" value="' + mins + '"></td>' +
      '<td><input type="number" min="0" max="59" data-idx="' + i + '" data-part="sec" value="' + secs + '"></td>' +
      '<td class="ttt" data-idx="' + i + '">T-' + formatMMSS(ring.ttt) + "</td>";
    body.appendChild(tr);
  });

  // live-update the "to touchdown" preview cell as inputs change
  body.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = inp.dataset.idx;
      const ttt = readRowSeconds(idx);
      body.querySelector('.ttt[data-idx="' + idx + '"]').textContent = "T-" + formatMMSS(ttt);
    });
  });
}

function readRowSeconds(idx) {
  const body = document.getElementById("config-table-body");
  const min = parseInt(body.querySelector('input[data-idx="' + idx + '"][data-part="min"]').value, 10) || 0;
  const sec = parseInt(body.querySelector('input[data-idx="' + idx + '"][data-part="sec"]').value, 10) || 0;
  return Math.max(0, min) * 60 + Math.max(0, sec);
}

function collectConfig() {
  const base = Sim.getTimings();
  return base.map((ring, i) => ({ nm: ring.nm, ttt: readRowSeconds(i) }));
}

function flashStatus(msg) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

function initConfig() {
  buildConfigTable(Sim.getTimings());

  document.getElementById("btn-save").addEventListener("click", () => {
    const updated = collectConfig();
    saveTimings(updated);
    Sim.setTimings(updated);
    buildConfigTable(updated);
    flashStatus("Saved ✓");
  });

  document.getElementById("btn-defaults").addEventListener("click", () => {
    const defaults = cloneDefaults();
    saveTimings(defaults);
    Sim.setTimings(defaults);
    buildConfigTable(defaults);
    flashStatus("Reset to defaults");
  });
}

/* ---- Ground config editor ---- */

function buildGroundConfigTable(phases) {
  const body = document.getElementById("ground-config-body");
  body.innerHTML = "";
  phases.forEach((phase, i) => {
    const mins = Math.floor(phase.duration / 60);
    const secs = phase.duration % 60;
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + phase.label + "</td>" +
      '<td><input type="number" min="0" data-gidx="' + i + '" data-part="min" value="' + mins + '"></td>' +
      '<td><input type="number" min="0" max="59" data-gidx="' + i + '" data-part="sec" value="' + secs + '"></td>' +
      '<td class="ttt" data-gidx="' + i + '">' + formatMMSS(phase.duration) + "</td>";
    body.appendChild(tr);
  });

  body.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = inp.dataset.gidx;
      const dur = readGroundRowSeconds(idx);
      body.querySelector('.ttt[data-gidx="' + idx + '"]').textContent = formatMMSS(dur);
    });
  });
}

function readGroundRowSeconds(idx) {
  const body = document.getElementById("ground-config-body");
  const min = parseInt(body.querySelector('input[data-gidx="' + idx + '"][data-part="min"]').value, 10) || 0;
  const sec = parseInt(body.querySelector('input[data-gidx="' + idx + '"][data-part="sec"]').value, 10) || 0;
  return Math.max(0, min) * 60 + Math.max(0, sec);
}

function collectGroundConfig() {
  const base = GroundSim.getPhases();
  return base.map((phase, i) => ({ id: phase.id, label: phase.label, duration: readGroundRowSeconds(i) }));
}

function flashGroundStatus(msg) {
  const el = document.getElementById("ground-save-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

function initGroundConfig() {
  buildGroundConfigTable(GroundSim.getPhases());

  document.getElementById("btn-ground-save").addEventListener("click", () => {
    const updated = collectGroundConfig();
    saveGroundPhases(updated);
    GroundSim.setPhases(updated);
    buildGroundConfigTable(updated);
    flashGroundStatus("Saved ✓");
  });

  document.getElementById("btn-ground-defaults").addEventListener("click", () => {
    const defaults = cloneGroundDefaults();
    saveGroundPhases(defaults);
    GroundSim.setPhases(defaults);
    buildGroundConfigTable(defaults);
    flashGroundStatus("Reset to defaults");
  });
}

/* ---- Circuit config editor ---- */

function buildCircuitConfigTable(phases) {
  const body = document.getElementById("circuit-config-body");
  body.innerHTML = "";
  phases.forEach((phase, i) => {
    const mins = Math.floor(phase.duration / 60);
    const secs = phase.duration % 60;
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + phase.label + "</td>" +
      '<td><input type="number" min="0" data-cidx="' + i + '" data-part="min" value="' + mins + '"></td>' +
      '<td><input type="number" min="0" max="59" data-cidx="' + i + '" data-part="sec" value="' + secs + '"></td>' +
      '<td class="ttt" data-cidx="' + i + '">' + formatMMSS(phase.duration) + "</td>";
    body.appendChild(tr);
  });

  body.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = inp.dataset.cidx;
      const dur = readCircuitRowSeconds(idx);
      body.querySelector('.ttt[data-cidx="' + idx + '"]').textContent = formatMMSS(dur);
    });
  });
}

function readCircuitRowSeconds(idx) {
  const body = document.getElementById("circuit-config-body");
  const min = parseInt(body.querySelector('input[data-cidx="' + idx + '"][data-part="min"]').value, 10) || 0;
  const sec = parseInt(body.querySelector('input[data-cidx="' + idx + '"][data-part="sec"]').value, 10) || 0;
  return Math.max(0, min) * 60 + Math.max(0, sec);
}

function collectCircuitConfig() {
  const base = CircuitCompare.getPhases();
  return base.map((phase, i) => ({ id: phase.id, label: phase.label, duration: readCircuitRowSeconds(i) }));
}

function flashCircuitStatus(msg) {
  const el = document.getElementById("circuit-save-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

function initCircuitConfig() {
  buildCircuitConfigTable(CircuitCompare.getPhases());

  document.getElementById("btn-circuit-save").addEventListener("click", () => {
    const updated = collectCircuitConfig();
    saveCircuitPhases(updated);
    CircuitCompare.setPhases(updated);
    buildCircuitConfigTable(updated);
    flashCircuitStatus("Saved ✓");
  });

  document.getElementById("btn-circuit-defaults").addEventListener("click", () => {
    const defaults = cloneCircuitDefaults();
    saveCircuitPhases(defaults);
    CircuitCompare.setPhases(defaults);
    buildCircuitConfigTable(defaults);
    flashCircuitStatus("Reset to defaults");
  });
}

/* ---- Break config editor ---- */

function buildBreakConfigTable(phases) {
  const body = document.getElementById("break-config-body");
  body.innerHTML = "";
  phases.forEach((phase, i) => {
    const mins = Math.floor(phase.duration / 60);
    const secs = phase.duration % 60;
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + phase.label + "</td>" +
      '<td><input type="number" min="0" data-bidx="' + i + '" data-part="min" value="' + mins + '"></td>' +
      '<td><input type="number" min="0" max="59" data-bidx="' + i + '" data-part="sec" value="' + secs + '"></td>' +
      '<td class="ttt" data-bidx="' + i + '">' + formatMMSS(phase.duration) + "</td>";
    body.appendChild(tr);
  });

  body.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = inp.dataset.bidx;
      const dur = readBreakRowSeconds(idx);
      body.querySelector('.ttt[data-bidx="' + idx + '"]').textContent = formatMMSS(dur);
    });
  });
}

function readBreakRowSeconds(idx) {
  const body = document.getElementById("break-config-body");
  const min = parseInt(body.querySelector('input[data-bidx="' + idx + '"][data-part="min"]').value, 10) || 0;
  const sec = parseInt(body.querySelector('input[data-bidx="' + idx + '"][data-part="sec"]').value, 10) || 0;
  return Math.max(0, min) * 60 + Math.max(0, sec);
}

function collectBreakConfig() {
  const base = BreakCompare.getPhases();
  return base.map((phase, i) => ({ id: phase.id, label: phase.label, duration: readBreakRowSeconds(i) }));
}

function flashBreakStatus(msg) {
  const el = document.getElementById("break-save-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

function initBreakConfig() {
  buildBreakConfigTable(BreakCompare.getPhases());

  document.getElementById("btn-break-save").addEventListener("click", () => {
    const updated = collectBreakConfig();
    saveBreakPhases(updated);
    BreakCompare.setPhases(updated);
    buildBreakConfigTable(updated);
    flashBreakStatus("Saved ✓");
  });

  document.getElementById("btn-break-defaults").addEventListener("click", () => {
    const defaults = cloneBreakDefaults();
    saveBreakPhases(defaults);
    BreakCompare.setPhases(defaults);
    buildBreakConfigTable(defaults);
    flashBreakStatus("Reset to defaults");
  });
}

/* ---- Default durations file (defaults.md) ---- */

/* Re-reads every data set (localStorage, else DEFAULT_*) into the sims and tables. */
function reloadAllConfig() {
  Sim.setTimings(loadTimings());
  buildConfigTable(Sim.getTimings());
  GroundSim.setPhases(loadGroundPhases());
  buildGroundConfigTable(GroundSim.getPhases());
  CircuitCompare.setPhases(loadCircuitPhases());
  buildCircuitConfigTable(CircuitCompare.getPhases());
  BreakCompare.setPhases(loadBreakPhases());
  buildBreakConfigTable(BreakCompare.getPhases());
}

/* Copies `src` values into the DEFAULT_* array `dest` so "Reset to defaults" uses them. */
function setDefaults(dest, src, field) {
  dest.forEach((row, i) => { row[field] = src[i][field]; });
}

function writeDefaultsFile(text) {
  if (window.showSaveFilePicker) {
    return window.showSaveFilePicker({
      suggestedName: DEFAULTS_FILE,
      types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
    })
      .then((handle) => handle.createWritable())
      .then((w) => w.write(text).then(() => w.close()));
  }
  // Fallback: download, then place it in the project root manually.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = DEFAULTS_FILE;
  a.click();
  URL.revokeObjectURL(a.href);
  return Promise.resolve();
}

function flashDefaultsStatus(msg) {
  const el = document.getElementById("defaults-file-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 3000);
}

function initDefaultsFile() {
  document.getElementById("btn-defaults-file").addEventListener("click", () => {
    const data = {
      timings: collectConfig(),
      ground: collectGroundConfig(),
      circuit: collectCircuitConfig(),
      break: collectBreakConfig(),
    };
    setDefaults(DEFAULT_TIMINGS, data.timings, "ttt");
    setDefaults(DEFAULT_GROUND_PHASES, data.ground, "duration");
    setDefaults(DEFAULT_CIRCUIT_PHASES, data.circuit, "duration");
    setDefaults(DEFAULT_BREAK_PHASES, data.break, "duration");
    saveTimings(data.timings);
    saveGroundPhases(data.ground);
    saveCircuitPhases(data.circuit);
    saveBreakPhases(data.break);
    reloadAllConfig();

    writeDefaultsFile(durationsToMarkdown(data))
      .then(() => flashDefaultsStatus("Saved " + DEFAULTS_FILE + " ✓"))
      .catch((e) => { if (e && e.name !== "AbortError") flashDefaultsStatus("Could not save file"); });
  });

  // Apply defaults.md once fetched; rows still on localStorage keep their saved values.
  loadDefaultsFile().then((applied) => { if (applied) reloadAllConfig(); });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSubTabs();
  Sim.init();
  initConfig();
  GroundSim.init();
  initGroundConfig();
  Compare.init();
  Compare18.init();
  CircuitCompare.init();
  initCircuitConfig();
  BreakCompare.init();
  initBreakConfig();
  initDefaultsFile();
  ADA.init();
  ADA18.init();
  Brief.init();
});
