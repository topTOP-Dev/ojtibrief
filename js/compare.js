/* Compare tab (RWY 36): side-by-side in-flight and ground (push back to rolling).
 * The arrival profile runs 40 NM (push back) down to 4 NM final (rolling for
 * take-off), decelerating on final as real traffic does. It is pinned to the
 * ground sequence at two anchors requested for OJTI briefing:
 *   - start of "Starting Taxi"      -> arrival at 20 NM final (abeam RIGTA)
 *   - start of "Taxi Passing TWY F" -> arrival at 15 NM final
 * Anchors are keyed to phase ids so they track user-edited phase durations. */

const COMPARE_START_NM = 40;
const COMPARE_END_NM = 4;
const COMPARE_ANCHORS = [
  { id: "taxi",  nm: 20 },   // starting to taxi -> 20 NM final (RIGTA)
  { id: "twy_f", nm: 15 },   // passing TWY F    -> 15 NM final
];

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

  /* (elapsed seconds, NM) anchors that pin the arrival to the ground sequence.
   * Push back -> 40 NM, then the requested interior anchors, down to 4 NM at
   * rolling. Built each call so it follows edited phase durations. */
  function nmAnchors() {
    var phases = getPhases();
    var anchors = [{ e: 0, nm: COMPARE_START_NM }];
    COMPARE_ANCHORS.forEach(function (a) {
      var idx = phases.findIndex(function (p) { return p.id === a.id; });
      if (idx >= 0) anchors.push({ e: elapsedAtStep(idx), nm: a.nm });
    });
    anchors.push({ e: totalGroundTime(), nm: COMPARE_END_NM });
    return anchors;
  }

  function inflightNMAtStep(stepIdx) {
    var anchors = nmAnchors();
    var e = elapsedAtStep(stepIdx);
    if (e <= anchors[0].e) return anchors[0].nm;
    var lastA = anchors[anchors.length - 1];
    if (e >= lastA.e) return lastA.nm;
    for (var i = 0; i < anchors.length - 1; i++) {
      if (e >= anchors[i].e && e <= anchors[i + 1].e) {
        var span = anchors[i + 1].e - anchors[i].e;
        var frac = span === 0 ? 0 : (e - anchors[i].e) / span;
        return anchors[i].nm + frac * (anchors[i + 1].nm - anchors[i].nm);
      }
    }
    return lastA.nm;
  }

  function render() {
    var phases = getPhases();
    var timings = getTimings();
    var nm = inflightNMAtStep(currentIndex);
    var ttt = interpolateTTT(timings, nm);

    drawScope(radarCtx, timings, 0, { nm: nm, ttt: ttt }, { rangeNm: COMPARE_SCOPE_RANGE_NM });
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
    currentIndex = getPhases().length - 1;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("cmp-correlation");
    var btn = document.getElementById("btn-cmp-toggle");
    var layout = document.querySelector("#tab-compare .compare-layout");
    var open = panel.classList.toggle("open");
    layout.classList.toggle("drawer-open", open);
    btn.textContent = open ? "Close" : "Table";
  }

  function init() {
    radarCtx = document.getElementById("compare-scope").getContext("2d");
    airportCtx = document.getElementById("compare-airport").getContext("2d");
    currentIndex = getPhases().length - 1;
    document.getElementById("btn-cmp-next").addEventListener("click", next);
    document.getElementById("btn-cmp-prev").addEventListener("click", prev);
    document.getElementById("btn-cmp-reset").addEventListener("click", reset);
    document.getElementById("btn-cmp-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render };
})();
