/* Mix Mode: an arrival on the radar correlated with the ground departure.
 *
 * RWY 36: the arrival runs 40 NM (push start) down to 4 NM final (end of
 * Line Up → Rolling), pinned to the ground sequence at two anchors keyed to
 * phase ids so they follow edited durations:
 *   - start of `taxi`     ("Start Taxi → TWY P")    -> 20 NM final (RIGTA)
 *   - start of `twy_f_hp` ("TWY F → Holding Point") -> 15 NM final
 * Piecewise-linear between anchors gives a decelerating arrival profile.
 *
 * RWY 18: the arrival flies the dog-leg from TUNTU, its track distance
 * advancing linearly with ground time until the 4 NM final. */

import {
  COMPARE_SCOPE_RANGE_NM, formatMMSS, interpolateTTT, phaseStart, totalDuration, type Phase,
} from "../config";
import { byId, canvasCtx } from "../core/canvas";
import type { Pt } from "../core/path";
import { Player } from "../core/player";
import {
  GROUND_ROUTE_18, GROUND_ROUTE_36, RWY18_LABELS, drawAirportBase, drawGroundAircraft, groundPose,
  type GroundRoute,
} from "../draw/airport";
import { CALLSIGN, TRAIL_STEPS, drawScopeBase, drawTarget, drawTrail, radialPoint, type ScopeGeom } from "../draw/radar";
import { RWY18_TOTAL_NM, drawRoute18Base, route18Point } from "../draw/radar18";
import { onStateChange, state } from "../state";
import { PhaseTable } from "../ui/phaseTable";
import { makeView, mountStats, type View } from "./common";
import { DEP_CALLSIGN } from "./ground";

const COMPARE_START_NM = 40;
const COMPARE_END_NM = 4;
const COMPARE_ANCHORS = [
  { id: "taxi", nm: 20 },     // starting to taxi   -> 20 NM final (RIGTA)
  { id: "twy_f_hp", nm: 15 }, // arriving at TWY F  -> 15 NM final
];

/** RWY 36 arrival range (NM to touchdown) at ground elapsed `t`. */
function nm36At(phases: Phase[], t: number): number {
  const anchors = [{ e: 0, nm: COMPARE_START_NM }];
  COMPARE_ANCHORS.forEach((a) => {
    const idx = phases.findIndex((p) => p.id === a.id);
    if (idx >= 0) anchors.push({ e: phaseStart(phases, idx), nm: a.nm });
  });
  anchors.push({ e: totalDuration(phases), nm: COMPARE_END_NM });
  if (t <= anchors[0].e) return anchors[0].nm;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (t >= anchors[i].e && t <= anchors[i + 1].e) {
      const span = anchors[i + 1].e - anchors[i].e;
      const f = span === 0 ? 0 : (t - anchors[i].e) / span;
      return anchors[i].nm + f * (anchors[i + 1].nm - anchors[i].nm);
    }
  }
  return COMPARE_END_NM;
}

/** RWY 18 arrival track distance remaining (NM) at ground elapsed `t`. */
function nm18At(phases: Phase[], t: number): number {
  const total = totalDuration(phases);
  const cum = total === 0 ? 0 : (Math.min(t, total) / total) * (RWY18_TOTAL_NM - COMPARE_END_NM);
  return RWY18_TOTAL_NM - cum;
}

interface MixCfg {
  key: string;
  route: GroundRoute;
  labels?: Record<string, string>;
  nmAt: (phases: Phase[], t: number) => number;
  drawScope: (ctx: CanvasRenderingContext2D) => ScopeGeom;
  point: (g: ScopeGeom, nm: number) => Pt;
}

function createMixView(cfg: MixCfg): View {
  const radar = canvasCtx(cfg.key + "-a");
  const ground = canvasCtx(cfg.key + "-b");
  const labelled = (): Phase[] =>
    state.ground.map((p) => ({ ...p, label: cfg.labels?.[p.id] ?? p.label }));

  const player = new Player(labelled());
  const view = makeView(cfg.key, player);
  const stat = mountStats(byId(cfg.key + "-stats"), [
    ["nm", "In-flight"], ["ttt", "To touchdown"], ["phase", "Ground phase"], ["left", "Phase left"],
  ]);
  const table = new PhaseTable(
    byId(cfg.key + "-table"),
    () => {
      const phases = labelled();
      return phases.map((p, i) => {
        const nm = cfg.nmAt(phases, phaseStart(phases, i));
        return [p.label, formatMMSS(p.duration), nm.toFixed(1) + " NM",
          "T-" + formatMMSS(interpolateTTT(state.timings, nm))];
      });
    },
    (i) => player.seek(player.boundaries()[i]),
  );

  player.onFrame((t) => {
    const phases = labelled();
    const timings = state.timings;
    const nm = cfg.nmAt(phases, t);
    const ttt = interpolateTTT(timings, nm);

    const g = cfg.drawScope(radar);
    drawTrail(radar, TRAIL_STEPS.filter((s) => t - s >= 0).map((s) => cfg.point(g, cfg.nmAt(phases, t - s))), "#9dffce");
    drawTarget(radar, cfg.point(g, nm), nm, ttt, CALLSIGN);

    const at = player.phaseAt(t);
    const phase = phases[at.index];
    drawAirportBase(ground, cfg.route, phase.id);
    drawGroundAircraft(ground, groundPose(cfg.route, phases, at), [DEP_CALLSIGN, phase.label]);

    stat("nm", nm.toFixed(1) + " NM");
    stat("ttt", "T-" + formatMMSS(ttt));
    stat("phase", phase.label);
    stat("left", formatMMSS(at.end - t));
    table.highlight(at.index, at.frac);
  });

  onStateChange(() => {
    player.setSegments(labelled());
    table.rebuild();
    player.emit();
  });
  player.emit();
  return view;
}

export function createMix36View(): View {
  return createMixView({
    key: "cmp36",
    route: GROUND_ROUTE_36,
    nmAt: nm36At,
    drawScope: (ctx) => drawScopeBase(ctx, state.timings, { rangeNm: COMPARE_SCOPE_RANGE_NM }),
    point: radialPoint,
  });
}

export function createMix18View(): View {
  return createMixView({
    key: "cmp18",
    route: GROUND_ROUTE_18,
    labels: RWY18_LABELS,
    nmAt: nm18At,
    drawScope: (ctx) => drawRoute18Base(ctx, state.timings),
    point: (g, nm) => route18Point(g, RWY18_TOTAL_NM - nm),
  });
}
