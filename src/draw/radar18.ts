/* RWY 18 arrival profile rendering (dog-leg approach from the north).
 * Route entry -> threshold, airport at scope centre, north = up, east = +x:
 *   TUNTU -> SUSEG -> MESUX -> PILEK -> CC181 -> RUNWAY
 * `cum` is cumulative track distance flown from TUNTU (NM).
 * Coordinates and distances per briefs/profile18.md. */

import { COMPARE_SCOPE_RANGE_NM, type Timing } from "../config";
import type { Pt } from "../core/path";
import { drawFix, drawScopeBase, type ScopeGeom } from "./radar";

interface RouteFix {
  name: string;
  x: number;
  y: number;
  cum: number;
  side: "left" | "right" | "top";
}

const RWY18_ROUTE: RouteFix[] = [
  { name: "TUNTU",  x: 14.0, y: 10.2, cum: 0.0,  side: "right" },
  { name: "SUSEG",  x: 14.0, y: 16.1, cum: 5.9,  side: "right" },
  { name: "MESUX",  x: 8.9,  y: 16.1, cum: 11.0, side: "top" },
  { name: "PILEK",  x: 0.0,  y: 16.1, cum: 19.9, side: "left" },
  { name: "CC181",  x: 0.0,  y: 7.3,  cum: 28.7, side: "left" },
  { name: "RUNWAY", x: 0.0,  y: 0.0,  cum: 36.0, side: "left" },
];

export const RWY18_TOTAL_NM = 36.0;

function fixPoint(g: ScopeGeom, fix: { x: number; y: number }): Pt {
  return { x: g.cx + fix.x * g.pxPerNm, y: g.cy - fix.y * g.pxPerNm };
}

/** Canvas point `cum` NM along the route from TUNTU. */
export function route18Point(g: ScopeGeom, cum: number): Pt {
  cum = Math.max(0, Math.min(RWY18_TOTAL_NM, cum));
  for (let i = 0; i < RWY18_ROUTE.length - 1; i++) {
    const a = RWY18_ROUTE[i], b = RWY18_ROUTE[i + 1];
    if (cum <= b.cum) {
      const seg = b.cum - a.cum;
      const f = seg === 0 ? 0 : (cum - a.cum) / seg;
      return fixPoint(g, { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) });
    }
  }
  return fixPoint(g, RWY18_ROUTE[RWY18_ROUTE.length - 1]);
}

/** Scope with the RWY 18 route + fixes (no aircraft). */
export function drawRoute18Base(ctx: CanvasRenderingContext2D, timings: Timing[]): ScopeGeom {
  const g = drawScopeBase(ctx, timings, { radial: false, rangeNm: COMPARE_SCOPE_RANGE_NM });

  ctx.strokeStyle = "rgba(56, 224, 138, 0.4)";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  RWY18_ROUTE.forEach((fix, i) => {
    const p = fixPoint(g, fix);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  RWY18_ROUTE.forEach((fix) => {
    if (fix.name !== "RUNWAY") drawFix(ctx, fixPoint(g, fix), fix.name, fix.side);
  });
  return g;
}
