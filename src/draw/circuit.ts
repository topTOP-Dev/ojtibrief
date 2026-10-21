/* Traffic circuit (pattern) diagram for VTCC RWY 36.
 * Right-hand touch-and-go pattern: upwind N, crosswind E, downwind S,
 * base W, final N, touchdown and roll back to lift-off. */

import { formatMMSS, type Phase } from "../config";
import {
  COLORS, FONT, clearDiagram, drawAircraft, drawCompass, drawRunway, drawTag, drawTitle,
} from "../core/canvas";
import { arcPoints, pointAlong, strokePolyline, type Pose, type Pt } from "../core/path";
import type { PhaseAt } from "../core/player";

const RWY_X = 200;
const RWY_TOP = 160;
const RWY_BOT = 440;
const PAT_RIGHT = 460;
const PAT_TOP = 100;
const PAT_BOT = 500;
const R = 40; // turn radius
const LIFTOFF: Pt = { x: RWY_X, y: 220 };
const TOUCHDOWN: Pt = { x: RWY_X, y: 400 };
const PI = Math.PI;

/* Turn centres: C1 upwind→crosswind, C2 crosswind→downwind,
 * C3 downwind→base, C4 base→final. Each phase ends mid-turn. */
const C1 = { x: RWY_X + R, y: PAT_TOP + R };
const C2 = { x: PAT_RIGHT - R, y: PAT_TOP + R };
const C3 = { x: PAT_RIGHT - R, y: PAT_BOT - R };
const C4 = { x: RWY_X + R, y: PAT_BOT - R };
const arc = (c: Pt, a0: number, a1: number) => arcPoints(c.x, c.y, R, a0, a1, 8);

/** Flight path per circuit phase id (polylines join end to start). */
export const CIRCUIT_PATHS: Record<string, Pt[]> = {
  upwind:    [LIFTOFF, ...arc(C1, PI, 1.25 * PI)],
  crosswind: [...arc(C1, 1.25 * PI, 1.5 * PI), ...arc(C2, 1.5 * PI, 1.75 * PI)],
  downwind:  [...arc(C2, 1.75 * PI, 2 * PI), ...arc(C3, 0, 0.25 * PI)],
  base:      [...arc(C3, 0.25 * PI, 0.5 * PI), ...arc(C4, 0.5 * PI, 0.75 * PI)],
  final:     [...arc(C4, 0.75 * PI, PI), TOUCHDOWN],
  touchdown: [TOUCHDOWN, LIFTOFF],
};

export function circuitPose(phases: Phase[], at: PhaseAt): Pose {
  return pointAlong(CIRCUIT_PATHS[phases[at.index].id], at.frac);
}

export function drawCircuit(ctx: CanvasRenderingContext2D, phases: Phase[], at: PhaseAt): void {
  clearDiagram(ctx);
  drawRunway(ctx, RWY_X, 24, RWY_TOP, RWY_BOT);

  // pattern, active phase highlighted
  const activeId = phases[at.index].id;
  Object.entries(CIRCUIT_PATHS).forEach(([id, pts]) => {
    const active = id === activeId;
    ctx.strokeStyle = active ? "rgba(157, 255, 206, 0.85)" : "rgba(37, 208, 125, 0.28)";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash(active ? [] : [8, 6]);
    strokePolyline(ctx, pts);
  });
  ctx.setLineDash([]);

  // touchdown / lift-off marks
  ctx.fillStyle = "rgba(255, 207, 138, 0.8)";
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  [[TOUCHDOWN, "TD"], [LIFTOFF, "LIFT-OFF"]].forEach(([p, name]) => {
    const pt = p as Pt;
    ctx.fillRect(pt.x + 14, pt.y - 1, 8, 2);
    ctx.fillText(name as string, pt.x + 26, pt.y);
  });

  // leg labels
  ctx.fillStyle = COLORS.label;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "center";
  const rotated = (text: string, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  rotated("DOWNWIND", PAT_RIGHT + 18, (PAT_TOP + PAT_BOT) / 2);
  rotated("FINAL", RWY_X - 24, (PAT_BOT + RWY_BOT) / 2);
  rotated("UPWIND", RWY_X - 24, (PAT_TOP + RWY_TOP) / 2 + 10);
  ctx.fillText("BASE", (RWY_X + PAT_RIGHT) / 2, PAT_BOT + 18);
  ctx.fillText("CROSSWIND", (RWY_X + PAT_RIGHT) / 2, PAT_TOP - 14);

  drawTitle(ctx, "VTCC — Traffic Circuit (RWY 36)");
  drawCompass(ctx);

  // aircraft
  const phase = phases[at.index];
  const pose = circuitPose(phases, at);
  drawAircraft(ctx, pose, pose.heading, COLORS.arr);
  drawTag(ctx, pose, [phase.label, formatMMSS((1 - at.frac) * phase.duration) + " to go"], COLORS.arr);
}
