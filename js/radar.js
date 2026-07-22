/* Radar scope rendering. Pure: draws from (timings, currentIndex) state only. */

const CALLSIGN = "TRN001";
const INBOUND_BEARING_DEG = 180; // straight-in from the south, flying north toward center

/* Named fixes along the inbound radial (NM from touchdown). */
const RADIAL_FIXES = [
  { name: "RIGTA", nm: 20 },
  { name: "LASOX", nm: 10 },
];

/* Returns canvas {x,y} for a point at `nm` along the inbound radial. */
function radialPoint(cx, cy, pxPerNm, nm) {
  const rad = ((INBOUND_BEARING_DEG - 90) * Math.PI) / 180; // 0deg = up
  const r = nm * pxPerNm;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/* Draws the scope scene (rings, fixes, radial, center) but no aircraft.
 * Returns geometry so callers can place their own blips.
 * `opts.radial === false` skips the straight-in inbound radial + its fixes,
 * so callers (e.g. the RWY 18 dog-leg profile) can draw their own route. */
function drawScopeBase(ctx, timings, opts) {
  opts = opts || {};
  const rangeNm = opts.rangeNm || SCOPE_RANGE_NM; // outer scope edge in NM
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const margin = 28;
  const maxRadius = Math.min(w, h) / 2 - margin;
  const pxPerNm = maxRadius / rangeNm;

  ctx.clearRect(0, 0, w, h);

  // --- compass tick lines (N/E/S/W) ---
  ctx.strokeStyle = "rgba(37, 208, 125, 0.12)";
  ctx.lineWidth = 1;
  for (let a = 0; a < 360; a += 90) {
    const rad = ((a - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxRadius * Math.cos(rad), cy + maxRadius * Math.sin(rad));
    ctx.stroke();
  }

  // --- outer scope edge ---
  ctx.strokeStyle = "rgba(37, 208, 125, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, rangeNm * pxPerNm, 0, Math.PI * 2);
  ctx.stroke();

  // --- range rings for each configured NM (skip any beyond the scope edge) ---
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  timings.forEach((ring) => {
    if (ring.nm > rangeNm) return;
    const r = ring.nm * pxPerNm;
    ctx.strokeStyle = "rgba(37, 208, 125, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // label at the top of each ring
    ctx.fillStyle = "rgba(111, 130, 120, 0.9)";
    ctx.fillText(String(ring.nm), cx, cy - r - 8);
  });

  // --- compass labels ---
  ctx.fillStyle = "rgba(56, 224, 138, 0.7)";
  ctx.font = "13px 'Segoe UI', sans-serif";
  ctx.fillText("N", cx, cy - maxRadius - 14);
  ctx.fillText("S", cx, cy + maxRadius + 14);
  ctx.fillText("E", cx + maxRadius + 14, cy);
  ctx.fillText("W", cx - maxRadius - 14, cy);

  if (opts.radial !== false) {
    // --- inbound radial track (scope edge -> center) ---
    const start = radialPoint(cx, cy, pxPerNm, rangeNm);
    ctx.strokeStyle = "rgba(56, 224, 138, 0.4)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- named fixes on the inbound radial ---
    ctx.textBaseline = "middle";
    RADIAL_FIXES.forEach((fix) => {
      const fp = radialPoint(cx, cy, pxPerNm, fix.nm);
      // waypoint triangle
      ctx.strokeStyle = "rgba(120, 210, 230, 0.9)";
      ctx.fillStyle = "rgba(120, 210, 230, 0.25)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y - 6);
      ctx.lineTo(fp.x + 5, fp.y + 4);
      ctx.lineTo(fp.x - 5, fp.y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // name label to the left of the fix
      ctx.fillStyle = "rgba(160, 225, 240, 0.95)";
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(fix.name, fp.x - 10, fp.y);
    });
  }

  // --- airport / center mark ---
  ctx.fillStyle = "#38e08a";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 224, 138, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.stroke();

  return { cx, cy, pxPerNm };
}

/* Draws a single aircraft blip + labelled data tag on the scope.
 * `side` places the tag ("right" default, "left" to avoid overlap). */
function drawScopeBlip(ctx, geom, nm, ttt, callsign, side, color) {
  color = color || "#9dffce";
  const pos = radialPoint(geom.cx, geom.cy, geom.pxPerNm, nm);
  const left = side === "left";

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const tagX = left ? pos.x - 18 : pos.x + 18;
  const tagY = pos.y - 26;
  ctx.strokeStyle = "rgba(157, 255, 206, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tagX, tagY + 14);
  ctx.stroke();

  ctx.textAlign = left ? "right" : "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c9ffe4";
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.fillText(callsign, tagX, tagY);
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.fillStyle = color;
  ctx.fillText(nm + " NM", tagX, tagY + 15);
  ctx.fillText("T-" + formatMMSS(ttt), tagX, tagY + 30);
}

function drawScope(ctx, timings, currentIndex, override, opts) {
  const geom = drawScopeBase(ctx, timings, opts);
  const ring = override || timings[currentIndex];
  drawScopeBlip(ctx, geom, ring.nm, ring.ttt, CALLSIGN, "right");
}
