/* Canvas helpers shared by every diagram. All drawing uses a fixed logical
 * 600×600 space; the backing store is scaled by devicePixelRatio so lines
 * stay crisp on phones, retina screens and projectors. */

import type { Pt } from "./path";

export const SIZE = 600;
export const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";

export const COLORS = {
  bg: "#0a100c",
  arr: "#9dffce",      // arrivals / own aircraft
  dep: "#ffcf8a",      // departures
  tagText: "#e3fff1",
  leader: "rgba(157, 255, 206, 0.7)",
  label: "rgba(111, 130, 120, 0.85)",
  accent: "rgba(56, 224, 138, 0.7)",
};

export function setupCanvas(el: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  el.width = SIZE * dpr;
  el.height = SIZE * dpr;
  const ctx = el.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error("Missing element #" + id);
  return el as T;
}

export function canvasCtx(id: string): CanvasRenderingContext2D {
  return setupCanvas(byId<HTMLCanvasElement>(id));
}

export function clearDiagram(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

/** Top-down aircraft glyph at `p`, nose along `heading` (canvas radians). */
export function drawAircraft(
  ctx: CanvasRenderingContext2D, p: Pt, heading: number, color: string, scale = 1, alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.rotate(heading);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  // nose → right wing → tail → left wing (glyph points east before rotation)
  ctx.moveTo(11, 0);
  ctx.quadraticCurveTo(9, -1.8, 4, -1.8);
  ctx.lineTo(1, -1.8);
  ctx.lineTo(-3, -10);
  ctx.lineTo(-6, -10);
  ctx.lineTo(-3.5, -1.8);
  ctx.lineTo(-8, -1.8);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-12, -5);
  ctx.lineTo(-10.5, 0);
  ctx.lineTo(-12, 5);
  ctx.lineTo(-10, 5);
  ctx.lineTo(-8, 1.8);
  ctx.lineTo(-3.5, 1.8);
  ctx.lineTo(-6, 10);
  ctx.lineTo(-3, 10);
  ctx.lineTo(1, 1.8);
  ctx.lineTo(4, 1.8);
  ctx.quadraticCurveTo(9, 1.8, 11, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Data tag: leader line from `p` to a title + subtitle lines. Flips to the
 * left automatically when it would run off the right edge. */
export function drawTag(
  ctx: CanvasRenderingContext2D, p: Pt, lines: string[], color: string,
  side: "left" | "right" | "auto" = "auto", alpha = 1,
): void {
  const left = side === "left" || (side === "auto" && p.x > SIZE - 190);
  const tagX = left ? p.x - 22 : p.x + 22;
  const tagY = Math.max(18, p.y - 32);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLORS.leader;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(tagX, tagY + 8);
  ctx.stroke();

  ctx.textAlign = left ? "right" : "left";
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? `600 12px ${FONT}` : `11px ${FONT}`;
    ctx.fillStyle = i === 0 ? COLORS.tagText : color;
    ctx.fillText(line, tagX, tagY + i * 15);
  });
  ctx.restore();
}

export function drawCompass(ctx: CanvasRenderingContext2D): void {
  const cx = SIZE - 40, cy = 40;
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", cx, cy - 18);
  ctx.strokeStyle = "rgba(56, 224, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 4, cy - 4);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 4, cy - 4);
  ctx.stroke();
}

export function drawTitle(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = "rgba(56, 224, 138, 0.55)";
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, 28);
}

/** Vertical runway with centreline, edges, threshold bars and end numbers. */
export function drawRunway(
  ctx: CanvasRenderingContext2D, x: number, w: number, top: number, bot: number,
): void {
  ctx.fillStyle = "#1a2420";
  ctx.fillRect(x - w / 2, top, w, bot - top);

  ctx.strokeStyle = "rgba(200, 210, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(x, top + 30);
  ctx.lineTo(x, bot - 30);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(200, 210, 200, 0.2)";
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top); ctx.lineTo(x - w / 2, bot);
  ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w / 2, bot);
  ctx.stroke();

  ctx.fillStyle = "rgba(200, 210, 200, 0.35)";
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillRect(x + i * 5 - 2, top + 8, 4, 14);
    ctx.fillRect(x + i * 5 - 2, bot - 22, 4, 14);
  }

  ctx.fillStyle = COLORS.accent;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("18", x, top - 14);
  ctx.fillText("36", x, bot + 14);
}
