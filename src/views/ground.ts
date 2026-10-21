/* Ground tab: the RWY 36 departure, push back to rolling, in real time. */

import { formatMMSS } from "../config";
import { byId, canvasCtx } from "../core/canvas";
import { Player } from "../core/player";
import { GROUND_ROUTE_36, drawAirportBase, drawGroundAircraft, groundPose } from "../draw/airport";
import { onStateChange, state } from "../state";
import { PhaseTable } from "../ui/phaseTable";
import { makeView, mountStats, type View } from "./common";

export const DEP_CALLSIGN = "TRN002";

export function createGroundView(): View {
  const ctx = canvasCtx("ground-a");
  const player = new Player(state.ground);
  const view = makeView("ground", player);
  const stat = mountStats(byId("ground-stats"), [
    ["phase", "Phase"], ["left", "Phase time left"], ["roll", "Rolling in"],
  ]);
  const table = new PhaseTable(
    byId("ground-table"),
    () => state.ground.map((p) => [p.label, formatMMSS(p.duration)]),
    (i) => player.seek(player.boundaries()[i]),
  );

  player.onFrame((t) => {
    const phases = state.ground;
    const at = player.phaseAt(t);
    const phase = phases[at.index];
    drawAirportBase(ctx, GROUND_ROUTE_36, phase.id);
    drawGroundAircraft(ctx, groundPose(GROUND_ROUTE_36, phases, at), [DEP_CALLSIGN, phase.label]);
    stat("phase", phase.label);
    stat("left", formatMMSS(at.end - t));
    stat("roll", formatMMSS(player.total - t));
    table.highlight(at.index, at.frac);
  });

  onStateChange(() => {
    player.setSegments(state.ground);
    table.rebuild();
    player.emit();
  });
  player.emit();
  return view;
}
