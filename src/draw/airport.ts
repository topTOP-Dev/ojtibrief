/* Simplified Chiang Mai International Airport (VTCC) top-down diagram.
 * Runway 18/36: 18 at the north end, 36 at the south end. Apron on the east.
 * TWY P is the parallel taxiway east of the runway. TWY E (just north of the
 * apron connector) is the vacating taxiway for RWY 36 landing traffic. TWY F
 * links P to the runway mid-south (RWY 18 landing traffic vacates there);
 * TWY H (RWY 36 holding point) and TWY A (RWY 18 holding point) link P to
 * the runway ends. */

import type { Phase } from "../config";
import {
  COLORS, FONT, clearDiagram, drawAircraft, drawCompass, drawRunway, drawTag, drawTitle,
} from "../core/canvas";
import { ease, pointAlong, smoothCorners, strokePolyline, type Ease, type Pose, type Pt } from "../core/path";
import type { PhaseAt } from "../core/player";

export const RWY_X = 220;
const RWY_W = 28;
const RWY_TOP = 50;
const RWY_BOT = 550;
const TWY_A_Y = 75;
export const TWY_E_Y = 255;
export const TWY_F_Y = 390;
const TWY_H_Y = 525;
export const CONNECTOR_Y = 300;
export const TWY_P_X = 340;
const APRON = { x: 410, y: 250, w: 130, h: 100 };
const HP_X = RWY_X + RWY_W / 2 + 14;

/** One phase's movement: polyline, speed profile, and whether the aircraft
 * moves tail-first (push back). */
export interface RouteLeg {
  pts: Pt[];
  ease: Ease;
  reverse?: boolean;
}
export type GroundRoute = Record<string, RouteLeg>;

function leg(pts: Pt[], e: Ease = ease.linear, reverse = false): RouteLeg {
  return { pts: smoothCorners(pts, 14), ease: e, reverse };
}

const STAND: Pt = { x: 495, y: CONNECTOR_Y };
const PUSHED: Pt = { x: 440, y: CONNECTOR_Y };
const easeOut: Ease = (f) => 1 - (1 - f) * (1 - f);

/** RWY 36: P southbound → F → hold at TWY H → line up on the south threshold. */
export const GROUND_ROUTE_36: GroundRoute = {
  pushback:    leg([STAND, PUSHED], ease.inOut, true),
  taxi:        leg([PUSHED, { x: TWY_P_X, y: CONNECTOR_Y }, { x: TWY_P_X, y: CONNECTOR_Y + 18 }], ease.inQuad),
  twy_p_f:     leg([{ x: TWY_P_X, y: CONNECTOR_Y + 18 }, { x: TWY_P_X, y: TWY_F_Y }]),
  twy_f_hp:    leg([{ x: TWY_P_X, y: TWY_F_Y }, { x: TWY_P_X, y: TWY_H_Y }, { x: HP_X + 18, y: TWY_H_Y }], easeOut),
  hp_lineup:   leg([{ x: HP_X + 18, y: TWY_H_Y }, { x: RWY_X, y: TWY_H_Y }, { x: RWY_X, y: 505 }], ease.holdThen(0.5)),
  lineup_roll: leg([{ x: RWY_X, y: 505 }, { x: RWY_X, y: 440 }], ease.holdThen(0.75, ease.inQuad)),
};

/** RWY 18: mirror of the RWY 36 route — P northbound to TWY A, line up on the
 * north threshold, roll south. Same phase ids. */
export const GROUND_ROUTE_18: GroundRoute = {
  pushback:    GROUND_ROUTE_36.pushback,
  taxi:        leg([PUSHED, { x: TWY_P_X, y: CONNECTOR_Y }, { x: TWY_P_X, y: CONNECTOR_Y - 18 }], ease.inQuad),
  twy_p_f:     leg([{ x: TWY_P_X, y: CONNECTOR_Y - 18 }, { x: TWY_P_X, y: 200 }]),
  twy_f_hp:    leg([{ x: TWY_P_X, y: 200 }, { x: TWY_P_X, y: TWY_A_Y }, { x: HP_X + 18, y: TWY_A_Y }], easeOut),
  hp_lineup:   leg([{ x: HP_X + 18, y: TWY_A_Y }, { x: RWY_X, y: TWY_A_Y }, { x: RWY_X, y: 95 }], ease.holdThen(0.5)),
  lineup_roll: leg([{ x: RWY_X, y: 95 }, { x: RWY_X, y: 160 }], ease.holdThen(0.75, ease.inQuad)),
};

/** The RWY 18 route never reaches TWY F, so its phases read differently there. */
export const RWY18_LABELS: Record<string, string> = {
  twy_p_f: "Along TWY P (northbound)",
  twy_f_hp: "TWY P → Holding Point (TWY A)",
};

/** Aircraft pose for the current phase of a ground route. */
export function groundPose(route: GroundRoute, phases: Phase[], at: PhaseAt): Pose {
  const l = route[phases[at.index].id];
  const pose = pointAlong(l.pts, l.ease(at.frac));
  return l.reverse ? { ...pose, heading: pose.heading + Math.PI } : pose;
}

/** Draws the airport diagram. With `route`, the departure route is overlaid
 * and the leg for `activeId` is highlighted. */
export function drawAirportBase(ctx: CanvasRenderingContext2D, route?: GroundRoute, activeId?: string): void {
  clearDiagram(ctx);
  drawRunway(ctx, RWY_X, RWY_W, RWY_TOP, RWY_BOT);

  // apron + stands
  ctx.fillStyle = "#14201a";
  ctx.strokeStyle = "rgba(37, 208, 125, 0.25)";
  ctx.lineWidth = 1;
  ctx.fillRect(APRON.x, APRON.y, APRON.w, APRON.h);
  ctx.strokeRect(APRON.x, APRON.y, APRON.w, APRON.h);
  ctx.fillStyle = "rgba(37, 208, 125, 0.18)";
  ctx.fillRect(APRON.x + APRON.w - 8, APRON.y, 8, APRON.h); // terminal edge
  ctx.strokeStyle = "rgba(255, 200, 50, 0.25)";
  ctx.setLineDash([4, 4]);
  [270, 300, 330].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(APRON.x + 40, y);
    ctx.lineTo(APRON.x + APRON.w - 12, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // taxiways
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  const twys: [number, number, number, number][] = [
    [TWY_P_X, TWY_A_Y, TWY_P_X, TWY_H_Y],           // TWY P (parallel)
    [APRON.x, CONNECTOR_Y, TWY_P_X, CONNECTOR_Y],    // apron connector
    [TWY_P_X, TWY_E_Y, RWY_X + RWY_W / 2, TWY_E_Y],  // TWY E (vacating)
    [TWY_P_X, TWY_F_Y, RWY_X + RWY_W / 2, TWY_F_Y],  // TWY F
    [TWY_P_X, TWY_H_Y, RWY_X + RWY_W / 2, TWY_H_Y],  // TWY H
    [TWY_P_X, TWY_A_Y, RWY_X + RWY_W / 2, TWY_A_Y],  // TWY A
  ];
  twys.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.lineCap = "butt";

  // parallel taxiway centreline
  ctx.strokeStyle = "rgba(200, 200, 100, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(TWY_P_X, TWY_A_Y);
  ctx.lineTo(TWY_P_X, TWY_H_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // holding point markings (dashed yellow bars before the runway)
  ctx.strokeStyle = "rgba(255, 200, 50, 0.7)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  [TWY_H_Y, TWY_A_Y].forEach((y) => {
    ctx.moveTo(HP_X, y - 9);
    ctx.lineTo(HP_X, y + 9);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // labels
  ctx.fillStyle = COLORS.label;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const midX = (TWY_P_X + RWY_X + RWY_W / 2) / 2 + 12;
  ctx.fillText("TWY E", midX, TWY_E_Y - 14);
  ctx.fillText("TWY F", midX, TWY_F_Y - 14);
  ctx.fillText("TWY H", midX, TWY_H_Y - 14);
  ctx.fillText("TWY A", midX, TWY_A_Y + 16);
  ctx.fillText("APRON", APRON.x + APRON.w / 2, APRON.y - 10);
  ctx.fillStyle = "rgba(255, 200, 50, 0.75)";
  ctx.fillText("HP", HP_X, TWY_H_Y + 18);
  ctx.fillText("HP", HP_X, TWY_A_Y - 16);
  ctx.save();
  ctx.fillStyle = COLORS.label;
  ctx.translate(TWY_P_X + 18, 200);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("TWY P", 0, 0);
  ctx.translate(-250, 0);
  ctx.fillText("TWY P", 0, 0);
  ctx.restore();

  drawTitle(ctx, "VTCC — Chiang Mai Intl");
  drawCompass(ctx);

  if (route) drawRouteOverlay(ctx, route, activeId);
}

function drawRouteOverlay(ctx: CanvasRenderingContext2D, route: GroundRoute, activeId?: string): void {
  Object.entries(route).forEach(([id, l]) => {
    const active = id === activeId;
    ctx.strokeStyle = active ? "rgba(255, 207, 138, 0.85)" : "rgba(255, 207, 138, 0.22)";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash(active ? [] : [5, 5]);
    strokePolyline(ctx, l.pts);
  });
  ctx.setLineDash([]);
}

/** Ground aircraft glyph + tag. */
export function drawGroundAircraft(
  ctx: CanvasRenderingContext2D, pose: Pose, lines: string[], color: string = COLORS.dep, alpha = 1,
): void {
  drawAircraft(ctx, pose, pose.heading, color, 1, alpha);
  drawTag(ctx, pose, lines, color, "auto", alpha);
}
