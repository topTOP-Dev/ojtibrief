/* Compare tab: side-by-side in-flight (from 40 NM) and ground (push back to rolling).
 * Ground push back starts when in-flight is at 40 NM.
 * Ground rolling ends when in-flight reaches 4 NM final.
 * In-flight position is interpolated based on elapsed ground time. */

const COMPARE_START_NM = 40;
const COMPARE_END_NM = 4;

function interpolateTTT(timings, nm) {
  if (nm >= timings[0].nm) return timings[0].ttt;
  if (nm <= 0) return 0;
  var last = timings[timings.length - 1];
  if (nm <= last.nm) return last.ttt * (nm / last.nm);
  for (var i = 0; i < timings.length - 1; i++) {
    if (nm <= timings[i].nm && nm >= timings[i + 1].nm) {
      var frac = (timings[i].nm - nm) / (timings[i].nm - timings[i + 1].nm);
      return timings[i].ttt + frac * (timings[i + 1].ttt - timings[i].ttt);
    }
  }
  return 0;
}

const Compare = (function () {
  var radarCtx = null;
  var airportCtx = null;
  var currentIndex = 0;

  function getPhases() { return GroundSim.getPhases(); }
  function getTimings() { return Sim.getTimings(); }

  function totalGroundTime() {
    return getPhases().reduce(function (sum, p) { return sum + p.duration; }, 0);
  }

  function elapsedAtStep(stepIdx) {
    var phases = getPhases();
    var elapsed = 0;
    for (var i = 0; i < stepIdx; i++) elapsed += phases[i].duration;
    return elapsed;
  }

  function inflightNMAtStep(stepIdx) {
    var total = totalGroundTime();
    if (total === 0) return COMPARE_START_NM;
    var elapsed = elapsedAtStep(stepIdx);
    var frac = elapsed / total;
    return COMPARE_START_NM - frac * (COMPARE_START_NM - COMPARE_END_NM);
  }

  function render() {
    var phases = getPhases();
    var timings = getTimings();
    var nm = inflightNMAtStep(currentIndex);
    var ttt = interpolateTTT(timings, nm);

    drawScope(radarCtx, timings, 0, { nm: nm, ttt: ttt });
    drawAirport(airportCtx, phases, currentIndex);

    var phase = phases[currentIndex];
    document.getElementById("cmp-inflight-nm").textContent = nm.toFixed(1) + " NM";
    document.getElementById("cmp-inflight-ttt").textContent = "T-" + formatMMSS(ttt);
    document.getElementById("cmp-ground-phase").textContent = phase.label;
    document.getElementById("cmp-ground-dur").textContent = formatMMSS(phase.duration);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("cmp-table-body");
    body.innerHTML = "";
    var phases = getPhases();
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
    document.getElementById("btn-cmp-prev").disabled = currentIndex === 0;
    document.getElementById("btn-cmp-next").disabled = currentIndex === getPhases().length - 1;
  }

  function next() {
    if (currentIndex < getPhases().length - 1) { currentIndex++; render(); }
  }

  function prev() {
    if (currentIndex > 0) { currentIndex--; render(); }
  }

  function reset() {
    currentIndex = 0;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("cmp-correlation");
    var btn = document.getElementById("btn-cmp-toggle");
    var visible = panel.style.display !== "none";
    panel.style.display = visible ? "none" : "block";
    btn.textContent = visible ? "Show Table" : "Hide Table";
  }

  function init() {
    radarCtx = document.getElementById("compare-scope").getContext("2d");
    airportCtx = document.getElementById("compare-airport").getContext("2d");
    document.getElementById("btn-cmp-next").addEventListener("click", next);
    document.getElementById("btn-cmp-prev").addEventListener("click", prev);
    document.getElementById("btn-cmp-reset").addEventListener("click", reset);
    document.getElementById("btn-cmp-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render };
})();
