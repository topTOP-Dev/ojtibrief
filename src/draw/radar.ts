/* Radar scope rendering. Pure: draws from the data it is given. */

import { SCOPE_RANGE_NM, formatMMSS, type Timing } from "../config";
import { FONT, SIZE } from "../core/canvas";
import type { Pt } from "../core/path";

export const CALLSIGN = "TRN001";
const INBOUND_BEARING_DEG = 180; // straight-in from the south, flying north toward center

/* Named fixes along the inbound radial (NM from touchdown). */
const RADIAL_FIXES = [
  { name: "RIGTA", nm: 20 },
  { name: "LASOX", nm: 10 },
];

export interface ScopeGeom {
  cx: number;
  cy: number;
  pxPerNm: number;
  maxRadius: number;
}

export interface ScopeOpts {
  rangeNm?: number;
  /** false skips the straight-in radial + fixes (the RWY 18 view draws its own route). */
  radial?: boolean;
}

/** Canvas point `nm` out along the inbound radial. */
export function radialPoint(g: ScopeGeom, nm: number): Pt {
  const rad = ((INBOUND_BEARING_DEG - 90) * Math.PI) / 180;
  const r = nm * g.pxPerNm;
  return { x: g.cx + r * Math.cos(rad), y: g.cy + r * Math.sin(rad) };
}

/** Draws the scope (rings, fixes, radial, centre, sweep) without aircraft. */
export function drawScopeBase(ctx: CanvasRenderingContext2D, timings: Timing[], opts: ScopeOpts = {}): ScopeGeom {
  const rangeNm = opts.rangeNm ?? SCOPE_RANGE_NM;
  const cx = SIZE / 2, cy = SIZE / 2;
  const maxRadius = SIZE / 2 - 28;
  const g: ScopeGeom = { cx, cy, pxPerNm: maxRadius / rangeNm, maxRadius };

  ctx.clearRect(0, 0, SIZE, SIZE);
  drawSweep(ctx, g);

  // compass tick lines (N/E/S/W)
  ctx.strokeStyle = "rgba(37, 208, 125, 0.12)";
  ctx.lineWidth = 1;
  for (let a = 0; a < 360; a += 90) {
    const rad = ((a - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxRadius * Math.cos(rad), cy + maxRadius * Math.sin(rad));
    ctx.stroke();
  }

  // outer scope edge
  ctx.strokeStyle = "rgba(37, 208, 125, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
  ctx.stroke();

  // range rings for each configured NM inside the scope
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  timings.forEach((ring) => {
    if (ring.nm > rangeNm) return;
    const r = ring.nm * g.pxPerNm;
    ctx.strokeStyle = "rgba(37, 208, 125, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (ring.nm >= rangeNm) return; // the scope edge already marks it
    ctx.fillStyle = "rgba(111, 130, 120, 0.9)";
    ctx.fillText(String(ring.nm), cx, cy - r - 8);
  });

  // compass labels
  ctx.fillStyle = "rgba(56, 224, 138, 0.7)";
  ctx.font = `13px ${FONT}`;
  ctx.fillText("N", cx, cy - maxRadius - 14);
  ctx.fillText("S", cx, cy + maxRadius + 14);
  ctx.fillText("E", cx + maxRadius + 14, cy);
  ctx.fillText("W", cx - maxRadius - 14, cy);

  if (opts.radial !== false) {
    // inbound radial track (scope edge -> centre)
    const start = radialPoint(g, rangeNm);
    ctx.strokeStyle = "rgba(56, 224, 138, 0.4)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    RADIAL_FIXES.forEach((fix) => {
      if (fix.nm > rangeNm) return;
      drawFix(ctx, radialPoint(g, fix.nm), fix.name, "left");
    });
  }

  // airport / centre mark
  ctx.fillStyle = "#38e08a";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 224, 138, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.stroke();

  return g;
}

/* Rotating radar sweep (wall-clock driven, one turn every 4 s). */
function drawSweep(ctx: CanvasRenderingContext2D, g: ScopeGeom): void {
  if (typeof ctx.createConicGradient !== "function") return;
  const angle = ((performance.now() / 4000) % 1) * Math.PI * 2;
  const grad = ctx.createConicGradient(angle, g.cx, g.cy);
  grad.addColorStop(0, "rgba(56, 224, 138, 0)");
  grad.addColorStop(0.9, "rgba(56, 224, 138, 0)");
  grad.addColorStop(1, "rgba(56, 224, 138, 0.16)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, g.maxRadius, 0, Math.PI * 2);
  ctx.fill();
}

/** Waypoint triangle + name. */
export function drawFix(
  ctx: CanvasRenderingContext2D, p: Pt, name: string, side: "left" | "right" | "top",
): void {
  ctx.strokeStyle = "rgba(120, 210, 230, 0.9)";
  ctx.fillStyle = "rgba(120, 210, 230, 0.25)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 6);
  ctx.lineTo(p.x + 5, p.y + 4);
  ctx.lineTo(p.x - 5, p.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(160, 225, 240, 0.95)";
  ctx.font = `bold 11px ${FONT}`;
  ctx.textBaseline = "middle";
  if (side === "left") {
    ctx.textAlign = "right";
    ctx.fillText(name, p.x - 10, p.y);
  } else if (side === "top") {
    ctx.textAlign = "center";
    ctx.fillText(name, p.x, p.y - 12);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(name, p.x + 10, p.y);
  }
}

/** Fading history dots behind a target (oldest first). */
export function drawTrail(ctx: CanvasRenderingContext2D, pts: Pt[], color: string): void {
  pts.forEach((p, i) => {
    ctx.globalAlpha = 0.12 + (0.45 * (i + 1)) / pts.length;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/** Radar target + data block (callsign, range, time to touchdown). */
export function drawTarget(
  ctx: CanvasRenderingContext2D, p: Pt, nm: number, ttt: number, callsign: string,
  side: "left" | "right" = "right", color = "#9dffce",
): void {
  const left = side === "left";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const tagX = left ? p.x - 18 : p.x + 18;
  const tagY = p.y - 26;
  ctx.strokeStyle = "rgba(157, 255, 206, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(tagX, tagY + 14);
  ctx.stroke();

  ctx.textAlign = left ? "right" : "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e3fff1";
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText(callsign, tagX, tagY);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(nm.toFixed(1) + " NM", tagX, tagY + 15);
  ctx.fillText("T-" + formatMMSS(ttt), tagX, tagY + 30);
}

/** Times (s before `t`) of the radar history dots. */
export const TRAIL_STEPS = [60, 48, 36, 24, 12];
