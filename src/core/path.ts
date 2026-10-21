/* Polyline geometry for animated movement on the 600×600 diagrams. */

export interface Pt {
  x: number;
  y: number;
}

/** Position plus direction of travel (canvas radians, 0 = east, + = clockwise). */
export interface Pose extends Pt {
  heading: number;
}

export type Ease = (f: number) => number;

const inOut: Ease = (f) => (f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2);

export const ease = {
  linear: ((f) => f) as Ease,
  inQuad: ((f) => f * f) as Ease,
  inOut,
  /** Stay put for the first `hold` fraction, then move with `then`. */
  holdThen(hold: number, then: Ease = inOut): Ease {
    return (f) => (f <= hold ? 0 : then((f - hold) / (1 - hold)));
  },
};

export function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Sample a circular arc into points (canvas angles: 0 = E, + = clockwise). */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, steps = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Rounds each interior corner of a polyline with a quadratic curve of
 * up to `r` px, so taxi turns look like turns rather than pivots. */
export function smoothCorners(pts: Pt[], r = 12, steps = 8): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const lab = Math.hypot(a.x - b.x, a.y - b.y);
    const lbc = Math.hypot(c.x - b.x, c.y - b.y);
    if (lab === 0 || lbc === 0) continue;
    const ra = Math.min(r, lab / 2), rc = Math.min(r, lbc / 2);
    const p1 = { x: b.x + ((a.x - b.x) * ra) / lab, y: b.y + ((a.y - b.y) * ra) / lab };
    const p2 = { x: b.x + ((c.x - b.x) * rc) / lbc, y: b.y + ((c.y - b.y) * rc) / lbc };
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push({
        x: u * u * p1.x + 2 * u * t * b.x + t * t * p2.x,
        y: u * u * p1.y + 2 * u * t * b.y + t * t * p2.y,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Point `frac` (0..1) of the way along a polyline, by arc length. */
export function pointAlong(pts: Pt[], frac: number): Pose {
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, heading: -Math.PI / 2 };
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  let d = Math.min(1, Math.max(0, frac)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const a = pts[i], b = pts[i + 1];
      const f = lens[i] === 0 ? 0 : Math.min(1, d / lens[i]);
      return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), heading: segmentHeading(pts, i) };
    }
    d -= lens[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, heading: segmentHeading(pts, pts.length - 2) };
}

/* Heading of segment i, skipping zero-length segments. */
function segmentHeading(pts: Pt[], i: number): number {
  for (let j = i; j >= 0; j--) {
    const dx = pts[j + 1].x - pts[j].x, dy = pts[j + 1].y - pts[j].y;
    if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
  }
  return -Math.PI / 2;
}

export function strokePolyline(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}
