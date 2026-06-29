/* Ground step controller — same IIFE pattern as Sim. */

const GroundSim = (function () {
  let phases = loadGroundPhases();
  let currentIndex = 0;
  let ctx = null;

  function render() {
    drawAirport(ctx, phases, currentIndex);
    renderReadout();
    renderPhaseList();
    updateButtons();
  }

  function renderReadout() {
    const phase = phases[currentIndex];
    document.getElementById("ground-readout-phase").textContent = phase.label;
    document.getElementById("ground-readout-dur").textContent = formatMMSS(phase.duration);
  }

  function renderPhaseList() {
    const body = document.getElementById("ground-phase-body");
    body.innerHTML = "";
    phases.forEach((phase, i) => {
      const tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + phase.label + "</td><td>" + formatMMSS(phase.duration) + "</td>";
      tr.addEventListener("click", () => {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-ground-prev").disabled = currentIndex === 0;
    document.getElementById("btn-ground-next").disabled = currentIndex === phases.length - 1;
  }

  function next() {
    if (currentIndex < phases.length - 1) {
      currentIndex++;
      render();
    }
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      render();
    }
  }

  function reset() {
    currentIndex = 0;
    render();
  }

  function setPhases(newPhases) {
    phases = newPhases;
    if (currentIndex >= phases.length) currentIndex = phases.length - 1;
    render();
  }

  function getPhases() {
    return phases;
  }

  function init() {
    ctx = document.getElementById("airport").getContext("2d");
    document.getElementById("btn-ground-next").addEventListener("click", next);
    document.getElementById("btn-ground-prev").addEventListener("click", prev);
    document.getElementById("btn-ground-reset").addEventListener("click", reset);
    render();
  }

  return { init, setPhases, getPhases };
})();
