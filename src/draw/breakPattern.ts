/* Military overhead-break diagram for VTCC RWY 36 (right-hand pattern).
 * Jet flies the initial up the runway centreline (over the final course),
 * breaks right at the break point beside TWY F, flies a 180° reversal onto
 * the downwind (east side), rolls out on final, and lands. */

import { formatMMSS, type Phase } from "../config";
import {
  COLORS, FONT, clearDiagram, drawAircraft, drawCompass, drawRunway, drawTag, drawTitle,
} from "../core/canvas";
import { arcPoints, ease, pointAlong, strokePolyline, type Pose, type Pt } from "../core/path";
import type { PhaseAt } from "../core/player";

/* Right-hand racetrack: left straight = final/initial course (runway
 * centreline, x=200), right straight = downwind (x=320), joined by two
 * 180° semicircular turns. The break/top turn is level with TWY F. */
const TOP_TURN = arcPoints(260, 345, 60, Math.PI, 2 * Math.PI, 18); // (200,345) → over the top → (320,345)
const BOT_TURN = arcPoints(260, 500, 60, 0, Math.PI, 18);           // (320,500) → under the bottom → (200,500)

/** Flight path per phase (index === phase index). Initial and final share
 * the runway centreline (x = 200). */
const BREAK_PHASE_PATHS: Pt[][] = [
  [{ x: 200, y: 560 }, { x: 200, y: 345 }],   // Initial → Break
  TOP_TURN.concat([{ x: 320, y: 500 }]),      // 180° Turn + downwind
  BOT_TURN,                                   // Base Leg
  [{ x: 200, y: 500 }, { x: 200, y: 300 }],   // Landing (final + rollout)
];

const BREAK_POINT: Pt = { x: 200, y: 345 };

export function breakPose(at: PhaseAt): Pose {
  const pts = BREAK_PHASE_PATHS[at.index];
  // landing decelerates through the rollout
  const f = at.index === 3 ? 1 - (1 - at.frac) * (1 - at.frac) : ease.linear(at.frac);
  return pointAlong(pts, f);
}

export function drawBreak(ctx: CanvasRenderingContext2D, phases: Phase[], at: PhaseAt): void {
  clearDiagram(ctx);
  const rwyX = 200, rwyW = 24;
  drawRunway(ctx, rwyX, rwyW, 180, 440);

  // taxiway F (the break point sits beside it)
  ctx.strokeStyle = "rgba(120, 150, 135, 0.5)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(rwyX + rwyW / 2, BREAK_POINT.y);
  ctx.lineTo(272, BREAK_POINT.y);
  ctx.stroke();
  ctx.fillStyle = "rgba(120, 150, 135, 0.7)";
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("TWY F", 240, BREAK_POINT.y - 12);

  // flight path, active phase highlighted
  BREAK_PHASE_PATHS.forEach((pts, idx) => {
    const active = idx === at.index;
    ctx.strokeStyle = active ? "rgba(157, 255, 206, 0.85)" : "rgba(37, 208, 125, 0.28)";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash(active ? [] : [8, 6]);
    strokePolyline(ctx, pts);
  });
  ctx.setLineDash([]);

  // break point marker
  ctx.strokeStyle = "rgba(255, 210, 120, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(BREAK_POINT.x - 7, BREAK_POINT.y - 7);
  ctx.lineTo(BREAK_POINT.x + 7, BREAK_POINT.y + 7);
  ctx.moveTo(BREAK_POINT.x + 7, BREAK_POINT.y - 7);
  ctx.lineTo(BREAK_POINT.x - 7, BREAK_POINT.y + 7);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 210, 120, 0.9)";
  ctx.textAlign = "right";
  ctx.fillText("Break Point", BREAK_POINT.x - 12, BREAK_POINT.y);

  // leg labels
  ctx.fillStyle = COLORS.label;
  ctx.textAlign = "center";
  [["INITIAL / FINAL", 184, 500], ["DOWNWIND", 340, 425]].forEach(([text, x, y]) => {
    ctx.save();
    ctx.translate(x as number, y as number);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text as string, 0, 0);
    ctx.restore();
  });

  drawTitle(ctx, "VTCC — Overhead Break (RWY 36)");
  drawCompass(ctx);

  const phase = phases[at.index];
  const pose = breakPose(at);
  drawAircraft(ctx, pose, pose.heading, COLORS.arr);
  drawTag(ctx, pose, [phase.label, formatMMSS((1 - at.frac) * phase.duration) + " to go"], COLORS.arr);
}
