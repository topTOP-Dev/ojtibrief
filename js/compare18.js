/* Mix Mode — RWY 18 sub-view: RWY 18 arrival profile (dog-leg from the north)
 * correlated against the ground departure, mirrored to depart RWY 18.
 * Ground push back starts when the arrival is at TUNTU (start of profile).
 * Ground rolling ends when the arrival reaches the 4 NM final.
 * Arrival position is interpolated along the route by elapsed ground time. */

const COMPARE18_END_NM = 4;                             // stop at 4 NM final
const COMPARE18_END_CUM = RWY18_TOTAL_NM - COMPARE18_END_NM;

const Compare18 = (function () {
  var radarCtx = null;
  var airportCtx = null;
  var currentIndex = -1;

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

  /* Track distance flown from TUNTU at a given ground step. */
  function cumAtStep(stepIdx) {
    var total = totalGroundTime();
    if (total === 0) return 0;
    var frac = elapsedAtStep(stepIdx) / total;
    return frac * COMPARE18_END_CUM;
  }

  function render() {
    var phases = getPhases();
    var timings = getTimings();
    var cum = cumAtStep(currentIndex);
    var dtt = RWY18_TOTAL_NM - cum;
    var ttt = interpolateTTT(timings, dtt);

    var geom = drawRoute18Base(radarCtx, timings);
    drawRoute18Blip(radarCtx, geom, cum, ttt, CALLSIGN, "right");
    drawAirport18(airportCtx, phases, currentIndex);

    var phase = phases[currentIndex];
    document.getElementById("c18-inflight-nm").textContent = dtt.toFixed(1) + " NM";
    document.getElementById("c18-inflight-ttt").textContent = "T-" + formatMMSS(ttt);
    document.getElementById("c18-ground-phase").textContent = phase.label;
    document.getElementById("c18-ground-dur").textContent = formatMMSS(phase.duration);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("c18-table-body");
    body.innerHTML = "";
    var phases = getPhases();
    var timings = getTimings();
    phases.forEach(function (phase, i) {
      var cum = cumAtStep(i);
      var dtt = RWY18_TOTAL_NM - cum;
      var ttt = interpolateTTT(timings, dtt);
      var tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + phase.label + "</td>" +
        "<td>" + formatMMSS(phase.duration) + "</td>" +
        "<td>" + dtt.toFixed(1) + " NM</td>" +
        "<td>T-" + formatMMSS(ttt) + "</td>";
      tr.addEventListener("click", function () {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-c18-prev").disabled = currentIndex === 0;
    document.getElementById("btn-c18-next").disabled = currentIndex === getPhases().length - 1;
  }

  function next() {
    if (currentIndex < getPhases().length - 1) { currentIndex++; render(); }
  }

  function prev() {
    if (currentIndex > 0) { currentIndex--; render(); }
  }

  function reset() {
    currentIndex = getPhases().length - 1;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("c18-correlation");
    var btn = document.getElementById("btn-c18-toggle");
    var layout = document.querySelector("#sub-compare-18 .compare-layout");
    var open = panel.classList.toggle("open");
    layout.classList.toggle("drawer-open", open);
    btn.textContent = open ? "Close" : "Table";
  }

  function init() {
    radarCtx = document.getElementById("compare18-scope").getContext("2d");
    airportCtx = document.getElementById("compare18-airport").getContext("2d");
    currentIndex = getPhases().length - 1;
    document.getElementById("btn-c18-next").addEventListener("click", next);
    document.getElementById("btn-c18-prev").addEventListener("click", prev);
    document.getElementById("btn-c18-reset").addEventListener("click", reset);
    document.getElementById("btn-c18-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render };
})();
