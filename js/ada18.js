/* Arrival · Departure · Arrival — RWY 18 sub-view. Same 4-step spacing idea
 * as the RWY 36 A-D-A, but both arrivals fly the RWY 18 dog-leg profile
 * (final from the north) and the departure is mirrored to depart RWY 18.
 *
 *  1. Both airborne : ARR1 at 5 NM final, ARR2 at SUSEG.
 *  2. ARR1 touchdown: departure holding at TWY A, ARR2 at PILEK.
 *  3. DEP line up    : ARR2 at 8 NM while ARR1 vacates the runway.
 *  4. DEP roll       : departure commences take-off roll, ARR2 at 4 NM final.
 *
 * `air` = remaining track distance to touchdown (NM), placed along the route. */

/* Ground positions (canvas coords match the airport.js diagram, RWY 18 end). */
const ADA18_DEP_POS = {
  holding: { x: 300, y: 110 },  // At Holding Point (TWY A, north)
  lineup:  { x: 220, y: 90 },   // Lined up, RWY 18 threshold (north)
  takeoff: { x: 220, y: 280 },  // Take-off roll, southbound down the runway
};
const ADA18_ARR1_POS = {
  touchdown: { x: 220, y: 150 },  // Touchdown zone on RWY 18 (north)
  vacating:  { x: 288, y: 390 },  // Vacating via TWY F (mid-field)
};

const ADA18_STEPS = [
  {
    label: "1 — Both airborne",
    arr1: { air: 5 },
    dep:  { ground: "holding", label: "Holding Point" },
    arr2: { air: 30, fix: "SUSEG" },
  },
  {
    label: "2 — ARR1 touchdown",
    arr1: { ground: "touchdown", label: "Touchdown" },
    dep:  { ground: "holding", label: "Holding Point" },
    arr2: { air: 16, fix: "PILEK" },
  },
  {
    label: "3 — DEP line up",
    arr1: { ground: "vacating", label: "Vacating" },
    dep:  { ground: "lineup", label: "Line Up" },
    arr2: { air: 8 },
  },
  {
    label: "4 — DEP take-off roll",
    arr1: null,
    dep:  { ground: "takeoff", label: "Take-off Roll" },
    arr2: { air: 4 },
  },
];

function ada18Arr1Text(step) {
  if (!step.arr1) return "—";
  if (step.arr1.air != null) return step.arr1.air + " NM final";
  return step.arr1.label + " (runway)";
}
function ada18Arr2Text(step) {
  var s = step.arr2.air + " NM";
  return step.arr2.fix ? step.arr2.fix + " (" + s + ")" : s + " final";
}

const ADA18 = (function () {
  var radarCtx = null;
  var airportCtx = null;
  var currentIndex = 0;

  function getTimings() { return Sim.getTimings(); }

  function renderScope(step) {
    var timings = getTimings();
    var geom = drawRoute18Base(radarCtx, timings);
    // Arrival 2 is always airborne on the profile (tag right).
    var cum2 = RWY18_TOTAL_NM - step.arr2.air;
    var t2 = interpolateTTT(timings, step.arr2.air);
    drawRoute18Blip(radarCtx, geom, cum2, t2, "ARR2", "right", ADA_ARR_COLOR);
    // Arrival 1 shows on the scope only while still airborne (tag left).
    if (step.arr1 && step.arr1.air != null) {
      var cum1 = RWY18_TOTAL_NM - step.arr1.air;
      var t1 = interpolateTTT(timings, step.arr1.air);
      drawRoute18Blip(radarCtx, geom, cum1, t1, "ARR1", "left", ADA_ARR_COLOR);
    }
  }

  function renderAirport(step) {
    drawAirportBase(airportCtx);
    var depPos = ADA18_DEP_POS[step.dep.ground];
    drawAirportBlip(airportCtx, depPos, "DEP", step.dep.label,
      step.dep.ground === "holding" ? "right" : "left", ADA_DEP_COLOR);
    if (step.arr1 && step.arr1.ground) {
      var a1 = ADA18_ARR1_POS[step.arr1.ground];
      drawAirportBlip(airportCtx, a1, "ARR1", step.arr1.label, "right", ADA_ARR_COLOR);
    }
  }

  function render() {
    var step = ADA18_STEPS[currentIndex];
    renderScope(step);
    renderAirport(step);

    document.getElementById("a18-arr1").textContent = ada18Arr1Text(step);
    document.getElementById("a18-dep").textContent = step.dep.label;
    document.getElementById("a18-arr2").textContent = ada18Arr2Text(step);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("a18-table-body");
    body.innerHTML = "";
    ADA18_STEPS.forEach(function (step, i) {
      var tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + step.label + "</td>" +
        "<td>" + ada18Arr1Text(step) + "</td>" +
        "<td>" + step.dep.label + "</td>" +
        "<td>" + ada18Arr2Text(step) + "</td>";
      tr.addEventListener("click", function () {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-a18-prev").disabled = currentIndex === 0;
    document.getElementById("btn-a18-next").disabled = currentIndex === ADA18_STEPS.length - 1;
  }

  function next() {
    if (currentIndex < ADA18_STEPS.length - 1) { currentIndex++; render(); }
  }

  function prev() {
    if (currentIndex > 0) { currentIndex--; render(); }
  }

  function reset() {
    currentIndex = 0;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("a18-correlation");
    var btn = document.getElementById("btn-a18-toggle");
    var layout = document.querySelector("#sub-ada-18 .compare-layout");
    var open = panel.classList.toggle("open");
    layout.classList.toggle("drawer-open", open);
    btn.textContent = open ? "Close" : "Table";
  }

  function init() {
    radarCtx = document.getElementById("ada18-scope").getContext("2d");
    airportCtx = document.getElementById("ada18-airport").getContext("2d");
    document.getElementById("btn-a18-next").addEventListener("click", next);
    document.getElementById("btn-a18-prev").addEventListener("click", prev);
    document.getElementById("btn-a18-reset").addEventListener("click", reset);
    document.getElementById("btn-a18-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render };
})();
