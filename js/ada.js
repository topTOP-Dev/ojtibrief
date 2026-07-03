/* Arrival · Departure · Arrival tab: spacing that lets a departure roll
 * between two arrivals. Same layout as Mix Mode (radar + airport). Fixed
 * 4-step scenario driven by the spacing rules below.
 *
 *  1. Both airborne : ARR1 at 5 NM, ARR2 at RIGTA (20 NM).
 *  2. ARR1 touchdown: departure at holding point, ARR2 at LASOX (10 NM).
 *  3. DEP line up    : ARR2 at 8 NM while ARR1 is vacating the runway.
 *  4. DEP roll       : departure commences take-off roll, ARR2 at 4 NM.
 *
 * Green = arrivals, amber = departure (consistent across both canvases). */

const ADA_ARR_COLOR = "#9dffce";
const ADA_DEP_COLOR = "#ffcf8a";

/* Ground positions (canvas coords match airport.js diagram). */
const ADA_DEP_POS = {
  holding: { x: 300, y: 490 },  // At Holding Point (TWY H)
  lineup:  { x: 220, y: 510 },  // Lined up, RWY 36 threshold
  takeoff: { x: 220, y: 320 },  // Take-off roll, up the runway
};
const ADA_ARR1_POS = {
  touchdown: { x: 220, y: 460 },  // Touchdown zone on RWY 36
  vacating:  { x: 288, y: 390 },  // Vacating via TWY F
};

const ADA_STEPS = [
  {
    label: "1 — Both airborne",
    arr1: { air: 5 },
    dep:  { ground: "holding", label: "Holding Point" },
    arr2: { air: 20, fix: "RIGTA" },
  },
  {
    label: "2 — ARR1 touchdown",
    arr1: { ground: "touchdown", label: "Touchdown" },
    dep:  { ground: "holding", label: "Holding Point" },
    arr2: { air: 10, fix: "LASOX" },
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

/* Human-readable state strings for the readout/table. */
function adaArr1Text(step) {
  if (!step.arr1) return "—";
  if (step.arr1.air != null) return step.arr1.air + " NM final";
  return step.arr1.label + " (runway)";
}
function adaArr2Text(step) {
  var s = step.arr2.air + " NM";
  return step.arr2.fix ? step.arr2.fix + " (" + s + ")" : s + " final";
}

const ADA = (function () {
  var radarCtx = null;
  var airportCtx = null;
  var currentIndex = 0;

  function getTimings() { return Sim.getTimings(); }

  function renderScope(step) {
    var timings = getTimings();
    var geom = drawScopeBase(radarCtx, timings);
    // Arrival 2 is always airborne (tag right).
    var t2 = interpolateTTT(timings, step.arr2.air);
    drawScopeBlip(radarCtx, geom, step.arr2.air, t2, "ARR2", "right", ADA_ARR_COLOR);
    // Arrival 1 only shows on the scope while still airborne (tag left).
    if (step.arr1 && step.arr1.air != null) {
      var t1 = interpolateTTT(timings, step.arr1.air);
      drawScopeBlip(radarCtx, geom, step.arr1.air, t1, "ARR1", "left", ADA_ARR_COLOR);
    }
  }

  function renderAirport(step) {
    drawAirportBase(airportCtx);
    // Departure (amber). Tag left when near the east taxiways to stay on canvas.
    var depPos = ADA_DEP_POS[step.dep.ground];
    drawAirportBlip(airportCtx, depPos, "DEP", step.dep.label,
      step.dep.ground === "holding" ? "right" : "left", ADA_DEP_COLOR);
    // Arrival 1 on the ground (green) when landing / vacating.
    if (step.arr1 && step.arr1.ground) {
      var a1 = ADA_ARR1_POS[step.arr1.ground];
      drawAirportBlip(airportCtx, a1, "ARR1", step.arr1.label, "right", ADA_ARR_COLOR);
    }
  }

  function render() {
    var step = ADA_STEPS[currentIndex];
    renderScope(step);
    renderAirport(step);

    document.getElementById("ada-arr1").textContent = adaArr1Text(step);
    document.getElementById("ada-dep").textContent = step.dep.label;
    document.getElementById("ada-arr2").textContent = adaArr2Text(step);

    renderTable();
    updateButtons();
  }

  function renderTable() {
    var body = document.getElementById("ada-table-body");
    body.innerHTML = "";
    ADA_STEPS.forEach(function (step, i) {
      var tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + step.label + "</td>" +
        "<td>" + adaArr1Text(step) + "</td>" +
        "<td>" + step.dep.label + "</td>" +
        "<td>" + adaArr2Text(step) + "</td>";
      tr.addEventListener("click", function () {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-ada-prev").disabled = currentIndex === 0;
    document.getElementById("btn-ada-next").disabled = currentIndex === ADA_STEPS.length - 1;
  }

  function next() {
    if (currentIndex < ADA_STEPS.length - 1) { currentIndex++; render(); }
  }

  function prev() {
    if (currentIndex > 0) { currentIndex--; render(); }
  }

  function reset() {
    currentIndex = 0;
    render();
  }

  function toggleCorrelation() {
    var panel = document.getElementById("ada-correlation");
    var btn = document.getElementById("btn-ada-toggle");
    var layout = document.querySelector("#tab-ada .compare-layout");
    var open = panel.classList.toggle("open");
    layout.classList.toggle("drawer-open", open);
    btn.textContent = open ? "Close" : "Table";
  }

  function init() {
    radarCtx = document.getElementById("ada-scope").getContext("2d");
    airportCtx = document.getElementById("ada-airport").getContext("2d");
    document.getElementById("btn-ada-next").addEventListener("click", next);
    document.getElementById("btn-ada-prev").addEventListener("click", prev);
    document.getElementById("btn-ada-reset").addEventListener("click", reset);
    document.getElementById("btn-ada-toggle").addEventListener("click", toggleCorrelation);
    render();
  }

  return { init: init, render: render };
})();
