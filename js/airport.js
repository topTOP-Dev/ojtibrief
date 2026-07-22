/* Simplified Chiang Mai International Airport (VTCC) top-down diagram.
 * Runway 18/36: 18 at north end, 36 at south end.
 * Apron on the west. Parallel taxiway west of runway.
 * TWY F connects parallel to runway (mid-south area).
 * TWY H connects parallel to south end of runway (holding point). */

const PHASE_POSITIONS = [
  { x: 450, y: 300 },  // Push Back — at apron/gate
  { x: 340, y: 300 },  // Starting Taxi — on parallel taxiway
  { x: 340, y: 390 },  // Taxi Passing TWY F — at TWY F intersection on parallel
  { x: 300, y: 490 },  // At Holding Point — TWY H, near south end of runway
  { x: 220, y: 510 },  // Line Up — on runway at RWY 36 threshold (south)
  { x: 220, y: 300 },  // Rolling — heading north up the runway
];

/* Draws the airport diagram (runway, taxiways, apron) but no aircraft. */
function drawAirportBase(ctx) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  // --- background ---
  ctx.fillStyle = "#0a100c";
  ctx.fillRect(0, 0, w, h);

  // --- runway 18/36 ---
  const rwyX = 220;
  const rwyW = 28;
  const rwyTop = 50;
  const rwyBot = 550;
  ctx.fillStyle = "#1a2420";
  ctx.fillRect(rwyX - rwyW / 2, rwyTop, rwyW, rwyBot - rwyTop);

  // runway centerline dashes
  ctx.strokeStyle = "rgba(200, 210, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(rwyX, rwyTop + 30);
  ctx.lineTo(rwyX, rwyBot - 30);
  ctx.stroke();
  ctx.setLineDash([]);

  // runway edge lines
  ctx.strokeStyle = "rgba(200, 210, 200, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rwyX - rwyW / 2, rwyTop);
  ctx.lineTo(rwyX - rwyW / 2, rwyBot);
  ctx.moveTo(rwyX + rwyW / 2, rwyTop);
  ctx.lineTo(rwyX + rwyW / 2, rwyBot);
  ctx.stroke();

  // threshold markings
  ctx.fillStyle = "rgba(200, 210, 200, 0.35)";
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillRect(rwyX + i * 5 - 2, rwyTop + 8, 4, 16);
    ctx.fillRect(rwyX + i * 5 - 2, rwyBot - 24, 4, 16);
  }

  // runway labels: 18 at north (top), 36 at south (bottom)
  ctx.fillStyle = "rgba(56, 224, 138, 0.7)";
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("18", rwyX, rwyTop - 14);
  ctx.fillText("36", rwyX, rwyBot + 14);

  // --- apron / gate area (east side) ---
  ctx.fillStyle = "#14201a";
  ctx.strokeStyle = "rgba(37, 208, 125, 0.25)";
  ctx.lineWidth = 1;
  const apronX = 410;
  const apronY = 250;
  const apronW = 120;
  const apronH = 100;
  ctx.fillRect(apronX, apronY, apronW, apronH);
  ctx.strokeRect(apronX, apronY, apronW, apronH);

  // gate markings
  ctx.strokeStyle = "rgba(37, 208, 125, 0.15)";
  for (let i = 0; i < 4; i++) {
    const gy = apronY + 15 + i * 22;
    ctx.beginPath();
    ctx.moveTo(apronX + 10, gy);
    ctx.lineTo(apronX + 40, gy);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(111, 130, 120, 0.7)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("APRON", apronX + apronW / 2, apronY - 10);

  // --- parallel taxiway (running N-S, east of runway) ---
  const twyParallelX = 340;
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(twyParallelX, rwyTop + 40);
  ctx.lineTo(twyParallelX, rwyBot - 40);
  ctx.stroke();

  // taxiway centerline
  ctx.strokeStyle = "rgba(200, 200, 100, 0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(twyParallelX, rwyTop + 40);
  ctx.lineTo(twyParallelX, rwyBot - 40);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- connector from apron to parallel taxiway ---
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(apronX, 300);
  ctx.lineTo(twyParallelX, 300);
  ctx.stroke();

  // --- TWY F (connects parallel taxiway to runway, mid-south) ---
  const twyFY = 390;
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(twyParallelX, twyFY);
  ctx.lineTo(rwyX + rwyW / 2, twyFY);
  ctx.stroke();

  // --- TWY H (connects parallel taxiway to south end of runway) ---
  const twyHY = 490;
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(twyParallelX, twyHY);
  ctx.lineTo(rwyX + rwyW / 2, twyHY);
  ctx.stroke();

  // --- TWY A (connects parallel taxiway to north end of runway, RWY 18 end) ---
  const twyAY = 110;
  ctx.strokeStyle = "rgba(37, 208, 125, 0.2)";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(twyParallelX, twyAY);
  ctx.lineTo(rwyX + rwyW / 2, twyAY);
  ctx.stroke();

  // --- holding point markings (dashed yellow line before runway) ---
  const hpX = rwyX + rwyW / 2 + 14;
  ctx.strokeStyle = "rgba(255, 200, 50, 0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(hpX, twyHY - 10);
  ctx.lineTo(hpX, twyHY + 10);
  ctx.moveTo(hpX, twyAY - 10);
  ctx.lineTo(hpX, twyAY + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- taxiway labels ---
  ctx.fillStyle = "rgba(111, 130, 120, 0.7)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TWY F", (twyParallelX + rwyX) / 2, twyFY - 14);
  ctx.fillText("TWY H", (twyParallelX + rwyX) / 2, twyHY - 14);
  ctx.fillText("TWY A", (twyParallelX + rwyX) / 2, twyAY - 14);
  ctx.fillText("HP", hpX - 14, twyHY + 4);
  ctx.fillText("HP", hpX - 14, twyAY + 4);

  // label for VTCC
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VTCC — Chiang Mai Intl", 20, 28);

  // --- compass rose (top-right) ---
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  const compassX = w - 40;
  const compassY = 40;
  ctx.fillText("N", compassX, compassY - 18);
  ctx.strokeStyle = "rgba(56, 224, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(compassX, compassY - 10);
  ctx.lineTo(compassX, compassY + 10);
  ctx.moveTo(compassX - 10, compassY);
  ctx.lineTo(compassX + 10, compassY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(compassX, compassY - 10);
  ctx.lineTo(compassX - 4, compassY - 4);
  ctx.moveTo(compassX, compassY - 10);
  ctx.lineTo(compassX + 4, compassY - 4);
  ctx.stroke();
}

/* Draws a single ground blip + labelled data tag on the airport diagram.
 * `side` places the tag ("right" default, "left" to avoid the edge). */
function drawAirportBlip(ctx, pos, title, subtitle, side, color) {
  color = color || "#9dffce";
  const left = side === "left";

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const tagX = left ? pos.x - 20 : pos.x + 20;
  const tagY = pos.y - 30;
  ctx.strokeStyle = "rgba(157, 255, 206, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tagX, tagY + 16);
  ctx.stroke();

  ctx.textAlign = left ? "right" : "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c9ffe4";
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.fillText(title, tagX, tagY);
  if (subtitle) {
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(subtitle, tagX, tagY + 15);
  }
}

function drawAirport(ctx, phases, currentIndex) {
  drawAirportBase(ctx);
  const phase = phases[currentIndex];
  drawAirportBlip(
    ctx,
    PHASE_POSITIONS[currentIndex],
    phase.label,
    "Duration: " + formatMMSS(phase.duration),
    "right"
  );
}

/* RWY 18 departure: mirror of the RWY 36 sequence — taxi north up the parallel
 * to TWY A, line up at the north (18) threshold, roll south. Same phase order. */
const RWY18_PHASE_POSITIONS = [
  { x: 450, y: 300 },  // Push Back — at apron/gate
  { x: 340, y: 300 },  // Starting Taxi — on parallel taxiway
  { x: 340, y: 200 },  // Taxi (heading north up the parallel toward TWY A)
  { x: 300, y: 110 },  // At Holding Point — TWY A, near north end of runway
  { x: 220, y: 90 },   // Line Up — on runway at RWY 18 threshold (north)
  { x: 220, y: 300 },  // Rolling — heading south down the runway
];

function drawAirport18(ctx, phases, currentIndex) {
  drawAirportBase(ctx);
  const phase = phases[currentIndex];
  drawAirportBlip(
    ctx,
    RWY18_PHASE_POSITIONS[currentIndex],
    phase.label,
    "Duration: " + formatMMSS(phase.duration),
    "right"
  );
}
