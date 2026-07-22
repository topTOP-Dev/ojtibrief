/* Circuit correlation tab: in-flight radar vs traffic circuit training.
 * Training aircraft leaves downwind when in-flight reaches CIRCUIT_ANCHOR_NM.
 * In-flight position is derived from actual timing data, not linear interpolation. */

function tttToNM(timings, targetTTT) {
  if (targetTTT <= 0) return 0;
  if (targetTTT >= timings[0].ttt) {
    return timings[0].nm * (targetTTT / timings[0].ttt);
  }
  for (var i = 0; i < timings.length - 1; i++) {
    if (targetTTT <= timings[i].ttt && targetTTT >= timings[i + 1].ttt) {
      var frac = (timings[i].ttt - targetTTT) / (timings[i].ttt - timings[i + 1].ttt);
      return timings[i].nm - frac * (timings[i].nm - timings[i + 1].nm);
    }
  }
  var last = timings[timings.length - 1];
  if (last.ttt <= 0) return 0;
  return last.nm * (targetTTT / last.ttt);
}

const CircuitCompare = (function () {
  var radarCtx = null;
  var circuitCtx = null;
  var currentIndex = 0;
  var phases = loadCircuitPhases();

  function getTimings() { return Sim.getTimings(); }
  function getPhases() { return phases; }

  function inflightNMAtStep(stepIdx) {
    var timings = getTimings();
    var elapsed = 0;
    for (var i = 0; i < stepIdx; i++) elapsed += phases[i].duration;
    var anchorElapsed = phases[0].duration;
    var anchorTTT = interpolateTTT(timings, CIRCUIT_ANCHOR_NM);
    var stepTTT = anchorTTT - (elapsed - anchorElapsed);
    return tttToNM(timings, Math.max(0, stepTTT));
  }

  function render() {
    var timings = getTimings();
    var nm = inflightNMAtStep(currentIndex);
    var ttt = interpolateTTT(timings, nm);

    drawScope(radarCtx, timings, 0, { nm: nm, ttt: ttt }, { rangeNm: COMPARE_SCOPE_RANGE_NM });
    drawCircuit(circuitCtx, phases, currentIndex);

    var phase = phases[currentIndex];
    document.getElementById("cir-inflight-nm").textContent = nm.toFixed(1) + " NM";
    document.getElementById("cir-inflight-ttt").textContent = "T-" + formatMMSS(ttt);
    document.getElementById("cir-circuit-phase").textContent = phase.label;
    document.getElementById("cir-circuit-dur").textContent = formatMMSS(phase.duration);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("cir-table-body");
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
    document.getElementById("btn-cir-prev").disabled = currentIndex === 0;
    document.getElementById("btn-cir-next").disabled = currentIndex === phases.length - 1;
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
    var panel = document.getElementById("cir-correlation");
    var btn = document.getElementById("btn-cir-toggle");
    var layout = document.querySelector("#tab-circuit .compare-layout");
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
    radarCtx = document.getElementById("circuit-scope").getContext("2d");
    circuitCtx = document.getElementById("circuit-pattern").getContext("2d");
    document.getElementById("btn-cir-next").addEventListener("click", next);
    document.getElementById("btn-cir-prev").addEventListener("click", prev);
    document.getElementById("btn-cir-reset").addEventListener("click", reset);
    document.getElementById("btn-cir-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render, getPhases: getPhases, setPhases: setPhases };
})();
