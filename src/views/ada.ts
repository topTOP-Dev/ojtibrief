/* Arrival · Departure · Arrival: spacing that lets a departure roll between
 * two arrivals. Fixed 4-step scenario per runway, animated between steps.
 * ARR2 is airborne throughout, so its time-to-touchdown sets the clock:
 * each transition lasts as long as ARR2 takes to fly between its ranges.
 *
 * RWY 36 (straight-in):
 *  1. Both airborne : ARR1 at 5 NM, ARR2 at RIGTA (20 NM).
 *  2. ARR1 touchdown: departure at holding point, ARR2 at LASOX (10 NM).
 *  3. DEP line up    : ARR2 at 8 NM while ARR1 is vacating the runway.
 *  4. DEP roll       : departure commences take-off roll, ARR2 at 4 NM.
 * RWY 18 (dog-leg from the north): same steps, ARR2 at SUSEG → PILEK → 8 → 4 NM
 * track distance to touchdown.
 *
 * Green = arrivals, amber = departure (consistent across both canvases). */

import { COMPARE_SCOPE_RANGE_NM, formatMMSS, interpolateTTT, tttToNM } from "../config";
import { COLORS, byId, canvasCtx } from "../core/canvas";
import { ease, lerp, pointAlong, smoothCorners, type Ease, type Pose, type Pt } from "../core/path";
import { Player, type Segment } from "../core/player";
import { GROUND_ROUTE_18, GROUND_ROUTE_36, drawAirportBase, drawGroundAircraft } from "../draw/airport";
import { drawScopeBase, drawTarget, radialPoint, type ScopeGeom } from "../draw/radar";
import { RWY18_TOTAL_NM, drawRoute18Base, route18Point } from "../draw/radar18";
import { onStateChange, state } from "../state";
import { PhaseTable } from "../ui/phaseTable";
import { makeView, mountStats, type View } from "./common";

interface AdaStep {
  label: string;
  arr1: { air: number } | { ground: string; label: string } | null;
  dep: { ground: string; label: string };
  arr2: { air: number; fix?: string };
}

const STEPS_36: AdaStep[] = [
  { label: "1 — Both airborne", arr1: { air: 5 },
    dep: { ground: "holding", label: "Holding Point" }, arr2: { air: 20, fix: "RIGTA" } },
  { label: "2 — ARR1 touchdown", arr1: { ground: "touchdown", label: "Touchdown" },
    dep: { ground: "holding", label: "Holding Point" }, arr2: { air: 10, fix: "LASOX" } },
  { label: "3 — DEP line up", arr1: { ground: "vacating", label: "Vacating" },
    dep: { ground: "lineup", label: "Line Up" }, arr2: { air: 8 } },
  { label: "4 — DEP take-off roll", arr1: null,
    dep: { ground: "takeoff", label: "Take-off Roll" }, arr2: { air: 4 } },
];

const STEPS_18: AdaStep[] = [
  { ...STEPS_36[0], arr2: { air: 30, fix: "SUSEG" } },
  { ...STEPS_36[1], arr2: { air: 16, fix: "PILEK" } },
  STEPS_36[2],
  STEPS_36[3],
];

/** Movement between two consecutive steps on the airport diagram. */
interface Move {
  pts: Pt[];
  ease: Ease;
  fadeIn?: boolean;  // arriving from off the diagram
  fadeOut?: boolean; // leaving the scenario
}

interface Scenario {
  key: string;
  steps: AdaStep[];
  drawScope: (ctx: CanvasRenderingContext2D) => ScopeGeom;
  point: (g: ScopeGeom, nm: number) => Pt;
  /** dep[i] = departure movement from step i to i+1. */
  dep: Move[];
  /** arr1[i] = ARR1 ground movement from step i to i+1 (null = airborne / gone). */
  arr1: (Move | null)[];
}

const still = (p: Pt, heading: number): Move => ({
  pts: [p, { x: p.x + Math.cos(heading) * 0.01, y: p.y + Math.sin(heading) * 0.01 }],
  ease: ease.linear,
});
const decel: Ease = (f) => 1 - (1 - f) * (1 - f);

const HOLD36 = GROUND_ROUTE_36.hp_lineup.pts[0];
const LINEUP36 = GROUND_ROUTE_36.hp_lineup.pts[GROUND_ROUTE_36.hp_lineup.pts.length - 1];
const HOLD18 = GROUND_ROUTE_18.hp_lineup.pts[0];
const LINEUP18 = GROUND_ROUTE_18.hp_lineup.pts[GROUND_ROUTE_18.hp_lineup.pts.length - 1];

const SCENARIO_36: Scenario = {
  key: "ada36",
  steps: STEPS_36,
  drawScope: (ctx) => drawScopeBase(ctx, state.timings, { rangeNm: COMPARE_SCOPE_RANGE_NM }),
  point: radialPoint,
  dep: [
    still(HOLD36, Math.PI),
    { pts: GROUND_ROUTE_36.hp_lineup.pts, ease: ease.inOut },
    { pts: [LINEUP36, { x: LINEUP36.x, y: 300 }], ease: ease.inQuad },
  ],
  arr1: [
    { pts: [{ x: 220, y: 640 }, { x: 220, y: 460 }], ease: ease.holdThen(0.75, decel), fadeIn: true },
    { pts: smoothCorners([{ x: 220, y: 460 }, { x: 220, y: 390 }, { x: 288, y: 390 }], 18), ease: decel },
    { pts: smoothCorners([{ x: 288, y: 390 }, { x: 340, y: 390 }, { x: 340, y: 420 }], 14), ease: ease.linear, fadeOut: true },
  ],
};

const SCENARIO_18: Scenario = {
  key: "ada18",
  steps: STEPS_18,
  drawScope: (ctx) => drawRoute18Base(ctx, state.timings),
  point: (g, nm) => route18Point(g, RWY18_TOTAL_NM - nm),
  dep: [
    still(HOLD18, Math.PI),
    { pts: GROUND_ROUTE_18.hp_lineup.pts, ease: ease.inOut },
    { pts: [LINEUP18, { x: LINEUP18.x, y: 300 }], ease: ease.inQuad },
  ],
  arr1: [
    { pts: [{ x: 220, y: -40 }, { x: 220, y: 150 }], ease: ease.holdThen(0.75, decel), fadeIn: true },
    { pts: smoothCorners([{ x: 220, y: 150 }, { x: 220, y: 390 }, { x: 288, y: 390 }], 18), ease: decel },
    { pts: smoothCorners([{ x: 288, y: 390 }, { x: 340, y: 390 }, { x: 340, y: 360 }], 14), ease: ease.linear, fadeOut: true },
  ],
};

function arr1Text(step: AdaStep): string {
  if (!step.arr1) return "—";
  if ("air" in step.arr1) return step.arr1.air + " NM final";
  return step.arr1.label + " (runway)";
}
function arr2Text(step: AdaStep): string {
  const s = step.arr2.air + " NM";
  return step.arr2.fix ? step.arr2.fix + " (" + s + ")" : s + " final";
}

function movePose(m: Move, f: number): { pose: Pose; alpha: number } {
  const pose = pointAlong(m.pts, m.ease(f));
  let alpha = 1;
  if (m.fadeIn) alpha = Math.min(1, Math.max(0, (f - 0.75) / 0.1));
  if (m.fadeOut) alpha = 1 - f;
  return { pose, alpha };
}

function createAdaView(sc: Scenario): View {
  const radar = canvasCtx(sc.key + "-a");
  const ground = canvasCtx(sc.key + "-b");
  const steps = sc.steps;

  const segments = (): Segment[] => steps.slice(1).map((s, i) => ({
    label: s.label,
    duration: Math.max(0,
      interpolateTTT(state.timings, steps[i].arr2.air) - interpolateTTT(state.timings, s.arr2.air)),
  }));

  const player = new Player(segments());
  const view = makeView(sc.key, player);
  const stat = mountStats(byId(sc.key + "-stats"), [
    ["arr1", "Arrival 1"], ["dep", "Departure"], ["arr2", "Arrival 2"], ["next", "Next step in"],
  ]);
  const table = new PhaseTable(
    byId(sc.key + "-table"),
    () => steps.map((s) => [s.label, arr1Text(s), s.dep.label, arr2Text(s)]),
    (i) => player.seek(player.boundaries()[i]),
  );

  player.onFrame((t) => {
    const timings = state.timings;
    const at = player.phaseAt(t);
    const done = t >= player.total;
    const i = at.index;               // transition step i -> i+1
    const f = at.frac;
    const from = steps[i];

    // --- radar ---
    const g = sc.drawScope(radar);
    const nm2 = tttToNM(timings, interpolateTTT(timings, steps[0].arr2.air) - t);
    drawTarget(radar, sc.point(g, nm2), nm2, interpolateTTT(timings, nm2), "ARR2", "right", COLORS.arr);
    if (from.arr1 && "air" in from.arr1 && f < 1) {
      const nm1 = lerp(from.arr1.air, 0, f);
      drawTarget(radar, sc.point(g, nm1), nm1, interpolateTTT(timings, nm1), "ARR1", "left", COLORS.arr);
    }

    // --- airport ---
    drawAirportBase(ground);
    const dep = movePose(sc.dep[i], f);
    const depLabel = f >= 1 ? steps[i + 1].dep.label : from.dep.label;
    drawGroundAircraft(ground, dep.pose, ["DEP", depLabel], COLORS.dep);
    const m1 = sc.arr1[i];
    if (m1) {
      const a1 = movePose(m1, f);
      const to = steps[i + 1].arr1;
      const label = to && "label" in to ? to.label : from.arr1 && "label" in from.arr1 ? from.arr1.label : "Landing";
      if (a1.alpha > 0.02) drawGroundAircraft(ground, a1.pose, ["ARR1", label], COLORS.arr, a1.alpha);
    }

    // --- readouts ---
    const cur = done ? steps.length - 1 : i;
    stat("arr1", arr1Text(steps[cur]));
    stat("dep", steps[cur].dep.label);
    stat("arr2", nm2.toFixed(1) + " NM");
    stat("next", done ? "—" : formatMMSS(at.end - t));
    table.highlight(cur, done ? 0 : f);
  });

  onStateChange(() => {
    player.setSegments(segments());
    player.emit();
  });
  player.emit();
  return view;
}

export const createAda36View = () => createAdaView(SCENARIO_36);
export const createAda18View = () => createAdaView(SCENARIO_18);
