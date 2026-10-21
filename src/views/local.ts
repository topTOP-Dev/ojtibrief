/* Local tab: one inbound flying the straight-in radial from 80 NM to
 * touchdown in real time, timed by the range-ring table. */

import { formatMMSS, tttToNM, type Timing } from "../config";
import { byId, canvasCtx } from "../core/canvas";
import { Player, type Segment } from "../core/player";
import { CALLSIGN, TRAIL_STEPS, drawScopeBase, drawTarget, drawTrail, radialPoint } from "../draw/radar";
import { onStateChange, state } from "../state";
import { PhaseTable } from "../ui/phaseTable";
import { makeView, mountStats, type View } from "./common";

function segmentsFor(timings: Timing[]): Segment[] {
  const segs = timings.slice(0, -1).map((r, i) => ({
    label: r.nm + " → " + timings[i + 1].nm + " NM",
    duration: r.ttt - timings[i + 1].ttt,
  }));
  const last = timings[timings.length - 1];
  segs.push({ label: last.nm + " NM → Touchdown", duration: last.ttt });
  return segs.map((s) => ({ ...s, duration: Math.max(0, s.duration) }));
}

export function createLocalView(): View {
  const ctx = canvasCtx("sim-a");
  const player = new Player(segmentsFor(state.timings));
  const view = makeView("sim", player);
  const stat = mountStats(byId("sim-stats"), [
    ["nm", "Range"], ["ttt", "To touchdown"], ["next", "Next ring"],
  ]);

  const nmAt = (t: number) => tttToNM(state.timings, state.timings[0].ttt - t);

  const table = new PhaseTable(
    byId("sim-table"),
    () => [
      ...state.timings.map((r) => [r.nm + " NM", "T-" + formatMMSS(r.ttt)]),
      ["Touchdown", "T-0:00"],
    ],
    (i) => player.seek(player.boundaries()[i]),
  );

  player.onFrame((t) => {
    const timings = state.timings;
    const ttt = Math.max(0, timings[0].ttt - t);
    const nm = nmAt(t);
    const g = drawScopeBase(ctx, timings);
    drawTrail(ctx, TRAIL_STEPS.filter((s) => t - s >= 0).map((s) => radialPoint(g, nmAt(t - s))), "#9dffce");
    drawTarget(ctx, radialPoint(g, nm), nm, ttt, CALLSIGN);

    const at = player.phaseAt(t);
    const done = t >= player.total;
    stat("nm", nm.toFixed(1) + " NM");
    stat("ttt", "T-" + formatMMSS(ttt));
    const nextRing = timings[at.index + 1];
    stat("next", done ? "Landed" : nextRing
      ? nextRing.nm + " NM in " + formatMMSS(at.end - t)
      : "Touchdown in " + formatMMSS(at.end - t));
    table.highlight(done ? timings.length : at.index, done ? 0 : at.frac);
  });

  onStateChange(() => {
    player.setSegments(segmentsFor(state.timings));
    table.rebuild();
    player.emit();
  });
  player.emit();
  return view;
}
