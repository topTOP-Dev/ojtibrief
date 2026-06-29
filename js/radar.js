/* Radar scope rendering. Pure: draws from (timings, currentIndex) state only. */

const CALLSIGN = "TRN001";
const INBOUND_BEARING_DEG = 180; // straight-in from the south, flying north toward center

/* Returns canvas {x,y} for a point at `nm` along the inbound radial. */
function radialPoint(cx, cy, pxPerNm, nm) {
  const rad = ((INBOUND_BEARING_DEG - 90) * Math.PI) / 180; // 0deg = up
  const r = nm * pxPerNm;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function drawScope(ctx, timings, currentIndex, override) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const margin = 28;
  const maxRadius = Math.min(w, h) / 2 - margin;
  const pxPerNm = maxRadius / SCOPE_RANGE_NM;

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

  // --- outer 100 NM edge ---
  ctx.strokeStyle = "rgba(37, 208, 125, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, SCOPE_RANGE_NM * pxPerNm, 0, Math.PI * 2);
  ctx.stroke();

  // --- range rings for each configured NM ---
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  timings.forEach((ring) => {
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

  // --- inbound radial track (100 NM -> center) ---
  const start = radialPoint(cx, cy, pxPerNm, SCOPE_RANGE_NM);
  ctx.strokeStyle = "rgba(56, 224, 138, 0.4)";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.setLineDash([]);

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

  // --- aircraft blip at current ring ---
  const ring = override || timings[currentIndex];
  const pos = radialPoint(cx, cy, pxPerNm, ring.nm);

  ctx.fillStyle = "#9dffce";
  ctx.shadowColor = "#38e08a";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // leader line + data tag (offset to the right of the blip)
  const tagX = pos.x + 18;
  const tagY = pos.y - 26;
  ctx.strokeStyle = "rgba(157, 255, 206, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tagX, tagY + 14);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#c9ffe4";
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.fillText(CALLSIGN, tagX, tagY);
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#9dffce";
  ctx.fillText(ring.nm + " NM", tagX, tagY + 15);
  ctx.fillText("T-" + formatMMSS(ring.ttt), tagX, tagY + 30);
}
