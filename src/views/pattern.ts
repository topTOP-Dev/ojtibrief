/* Circuit and Overhead tabs: an inbound on the radar correlated with a
 * training pattern. The inbound is at `anchor.nm` when the pattern aircraft
 * is `anchor.frac` through phase `anchor.id`, then counts down by the ring
 * timings:
 *   - Circuit:  20 NM midway along downwind
 *   - Overhead: 20 NM at the start of the 180° turn (over the break point) */

import {
  BREAK_ANCHOR, CIRCUIT_ANCHOR, COMPARE_SCOPE_RANGE_NM, formatMMSS, interpolateTTT, phaseStart,
  tttToNM, type PatternAnchor, type Phase,
} from "../config";
import { byId, canvasCtx } from "../core/canvas";
import { Player, type PhaseAt } from "../core/player";
import { drawBreak } from "../draw/breakPattern";
import { drawCircuit } from "../draw/circuit";
import { CALLSIGN, TRAIL_STEPS, drawScopeBase, drawTarget, drawTrail, radialPoint } from "../draw/radar";
import { onStateChange, state } from "../state";
import { PhaseTable } from "../ui/phaseTable";
import { makeView, mountStats, type View } from "./common";

interface PatternCfg {
  key: string;
  phaseLabel: string;
  phases: () => Phase[];
  anchor: PatternAnchor;
  draw: (ctx: CanvasRenderingContext2D, phases: Phase[], at: PhaseAt) => void;
  loop?: boolean;
}

function createPatternView(cfg: PatternCfg): View {
  const radar = canvasCtx(cfg.key + "-a");
  const pattern = canvasCtx(cfg.key + "-b");
  const player = new Player(cfg.phases());
  const view = makeView(cfg.key, player, { loop: cfg.loop });
  const stat = mountStats(byId(cfg.key + "-stats"), [
    ["nm", "In-flight"], ["ttt", "To touchdown"], ["phase", cfg.phaseLabel], ["left", "Phase left"],
  ]);

  function nmAt(phases: Phase[], t: number): number {
    const idx = Math.max(0, phases.findIndex((p) => p.id === cfg.anchor.id));
    const anchorT = phaseStart(phases, idx) + (cfg.anchor.frac ?? 0) * (phases[idx]?.duration ?? 0);
    const anchorTTT = interpolateTTT(state.timings, cfg.anchor.nm);
    return tttToNM(state.timings, Math.max(0, anchorTTT - (t - anchorT)));
  }

  const table = new PhaseTable(
    byId(cfg.key + "-table"),
    () => {
      const phases = cfg.phases();
      return phases.map((p, i) => {
        const nm = nmAt(phases, phaseStart(phases, i));
        return [p.label, formatMMSS(p.duration), nm.toFixed(1) + " NM",
          "T-" + formatMMSS(interpolateTTT(state.timings, nm))];
      });
    },
    (i) => player.seek(player.boundaries()[i]),
  );

  player.onFrame((t) => {
    const phases = cfg.phases();
    const nm = nmAt(phases, t);
    const ttt = interpolateTTT(state.timings, nm);
    const g = drawScopeBase(radar, state.timings, { rangeNm: COMPARE_SCOPE_RANGE_NM });
    drawTrail(radar, TRAIL_STEPS.filter((s) => t - s >= 0).map((s) => radialPoint(g, nmAt(phases, t - s))), "#9dffce");
    drawTarget(radar, radialPoint(g, nm), nm, ttt, CALLSIGN);

    const at = player.phaseAt(t);
    cfg.draw(pattern, phases, at);

    stat("nm", nm.toFixed(1) + " NM");
    stat("ttt", "T-" + formatMMSS(ttt));
    stat("phase", phases[at.index].label);
    stat("left", formatMMSS(at.end - t));
    table.highlight(at.index, at.frac);
  });

  onStateChange(() => {
    player.setSegments(cfg.phases());
    table.rebuild();
    player.emit();
  });
  player.emit();
  return view;
}

export function createCircuitView(): View {
  return createPatternView({
    key: "circuit",
    phaseLabel: "Circuit phase",
    phases: () => state.circuit,
    anchor: CIRCUIT_ANCHOR,
    draw: drawCircuit,
    loop: true,
  });
}

export function createBreakView(): View {
  return createPatternView({
    key: "break",
    phaseLabel: "Break phase",
    phases: () => state.break,
    anchor: BREAK_ANCHOR,
    draw: drawBreak,
  });
}
