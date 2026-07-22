/* Break correlation tab: in-flight radar vs military overhead-break pattern.
 * Inbound arrival is at BREAK_ANCHOR_NM when the jet crosses the Break Point
 * (end of phase 0), then counts down through the rest of the pattern.
 * Reuses the global tttToNM() defined in circuit-compare.js. */

const BreakCompare = (function () {
  var radarCtx = null;
  var patternCtx = null;
  var currentIndex = 0;
  var phases = loadBreakPhases();

  function getTimings() { return Sim.getTimings(); }
  function getPhases() { return phases; }

  function inflightNMAtStep(stepIdx) {
    var timings = getTimings();
    var elapsed = 0;
    for (var i = 0; i < stepIdx; i++) elapsed += phases[i].duration;
    var anchorElapsed = phases[0].duration;
    var anchorTTT = interpolateTTT(timings, BREAK_ANCHOR_NM);
    var stepTTT = anchorTTT - (elapsed - anchorElapsed);
    return tttToNM(timings, Math.max(0, stepTTT));
  }

  function render() {
    var timings = getTimings();
    var nm = inflightNMAtStep(currentIndex);
    var ttt = interpolateTTT(timings, nm);

    drawScope(radarCtx, timings, 0, { nm: nm, ttt: ttt }, { rangeNm: COMPARE_SCOPE_RANGE_NM });
    drawBreak(patternCtx, phases, currentIndex);

    var phase = phases[currentIndex];
    document.getElementById("brk-inflight-nm").textContent = nm.toFixed(1) + " NM";
    document.getElementById("brk-inflight-ttt").textContent = "T-" + formatMMSS(ttt);
    document.getElementById("brk-pattern-phase").textContent = phase.label;
    document.getElementById("brk-pattern-dur").textContent = formatMMSS(phase.duration);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("brk-table-body");
    body.innerHTML = "";
    var timings = getTimings();
    phases.forEach(function (phase, i) {
      var nm = inflightNMAtStep(i);
      var ttt = interpolateTTT(timings, nm);
      var tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + phase.label + "</td>" +
        "<td>" + formatMMSS(phase.duration) + "</td>" +
        "<td>" + nm.toFixed(1) + " NM</td>" +
        "<td>T-" + formatMMSS(ttt) + "</td>";
      tr.addEventListener("click", function () {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-brk-prev").disabled = currentIndex === 0;
    document.getElementById("btn-brk-next").disabled = currentIndex === phases.length - 1;
  }

  function next() {
    if (currentIndex < phases.length - 1) { currentIndex++; render(); }
  }

  function prev() {
    if (currentIndex > 0) { currentIndex--; render(); }
  }

  function reset() {
    currentIndex = 0;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("brk-correlation");
    var btn = document.getElementById("btn-brk-toggle");
    var layout = document.querySelector("#tab-break .compare-layout");
    var open = panel.classList.toggle("open");
    layout.classList.toggle("drawer-open", open);
    btn.textContent = open ? "Close" : "Table";
  }

  function setPhases(newPhases) {
    phases = newPhases;
    if (currentIndex >= phases.length) currentIndex = phases.length - 1;
    render();
  }

  function init() {
    radarCtx = document.getElementById("break-scope").getContext("2d");
    patternCtx = document.getElementById("break-pattern").getContext("2d");
    document.getElementById("btn-brk-next").addEventListener("click", next);
    document.getElementById("btn-brk-prev").addEventListener("click", prev);
    document.getElementById("btn-brk-reset").addEventListener("click", reset);
    document.getElementById("btn-brk-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render, getPhases: getPhases, setPhases: setPhases };
})();
