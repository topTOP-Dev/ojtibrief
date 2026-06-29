/* Step controller: holds the current ring index and drives the scope + side panel.
 * `timings` is the single source of truth, shared with the config editor in app.js. */

const Sim = (function () {
  let timings = loadTimings();
  let currentIndex = 0;
  let ctx = null;

  function render() {
    drawScope(ctx, timings, currentIndex);
    renderReadout();
    renderRingList();
    updateButtons();
  }

  function renderReadout() {
    const ring = timings[currentIndex];
    document.getElementById("readout-nm").textContent = ring.nm + " NM";
    document.getElementById("readout-ttt").textContent = "T-" + formatMMSS(ring.ttt);
  }

  function renderRingList() {
    const body = document.getElementById("ring-list-body");
    body.innerHTML = "";
    timings.forEach((ring, i) => {
      const tr = document.createElement("tr");
      if (i === currentIndex) tr.className = "current";
      tr.innerHTML =
        "<td>" + ring.nm + " NM</td><td>T-" + formatMMSS(ring.ttt) + "</td>";
      tr.addEventListener("click", () => {
        currentIndex = i;
        render();
      });
      body.appendChild(tr);
    });
  }

  function updateButtons() {
    document.getElementById("btn-prev").disabled = currentIndex === 0;
    document.getElementById("btn-next").disabled = currentIndex === timings.length - 1;
  }

  function next() {
    if (currentIndex < timings.length - 1) {
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

  /* Called by the config editor after a save so the sim reflects new times. */
  function setTimings(newTimings) {
    timings = newTimings;
    if (currentIndex >= timings.length) currentIndex = timings.length - 1;
    render();
  }

  function getTimings() {
    return timings;
  }

  function init() {
    ctx = document.getElementById("scope").getContext("2d");
    document.getElementById("btn-next").addEventListener("click", next);
    document.getElementById("btn-prev").addEventListener("click", prev);
    document.getElementById("btn-reset").addEventListener("click", reset);
    render();
  }

  return { init, setTimings, getTimings };
})();
