/* Military overhead-break diagram for VTCC RWY 36 (right-hand pattern).
 * Jet flies the initial up the runway centerline (over the final course),
 * breaks right at the break point beside TWY F, flies a 180° reversal onto
 * the downwind (east side), rolls out on final, and lands. */

/* Sample a circular arc into {x, y} points (canvas angles: 0=E, +=CW). */
function breakArcPts(cx, cy, r, startAng, endAng, steps) {
  var pts = [];
  for (var i = 0; i <= steps; i++) {
    var a = startAng + (endAng - startAng) * (i / steps);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/* Right-hand racetrack: left straight = final/initial course (runway
 * centerline, x=200), right straight = downwind (x=320), joined by two
 * 180° semicircular turns. The break/top turn is level with TWY F. */
var BREAK_TOP_TURN = breakArcPts(260, 345, 60, Math.PI, 2 * Math.PI, 18); // (200,345)→ over top →(320,345)
var BREAK_BOT_TURN = breakArcPts(260, 500, 60, 0, Math.PI, 18);           // (320,500)→ under bottom →(200,500)

/* Flight path split by phase (index === phase index). Each entry is a
 * polyline of {x, y} points; the active phase is drawn highlighted.
 * Initial and final share the runway centerline (x = 200). */
const BREAK_PHASE_PATHS = [
  // 0 — Initial → Break (up the centerline, over the final course)
  [ { x: 200, y: 560 }, { x: 200, y: 345 } ],
  // 1 — 180° Turn (break onto the downwind) + downwind leg
  BREAK_TOP_TURN.concat([ { x: 320, y: 500 } ]),
  // 2 — Base Leg (180° turn from downwind onto final)
  BREAK_BOT_TURN,
  // 3 — Landing (final rollout up the runway)
  [ { x: 200, y: 500 }, { x: 200, y: 300 } ],
];

const BREAK_BLIP_POSITIONS = [
  { x: 200, y: 455 },  // Initial → Break — on the centerline
  { x: 320, y: 430 },  // 180° Turn — mid downwind (east)
  { x: 260, y: 558 },  // Base Leg — through the bottom turn
  { x: 200, y: 390 },  // Landing — on the runway
];

const BREAK_POINT = { x: 200, y: 345 };  // on the runway centerline, beside TWY F

function drawBreak(ctx, phases, currentIndex) {
  var w = ctx.canvas.width;
  var h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#0a100c";
  ctx.fillRect(0, 0, w, h);

  // --- runway 18/36 ---
  var rwyX = 200;
  var rwyW = 24;
  var rwyTop = 180;
  var rwyBot = 440;

  ctx.fillStyle = "#1a2420";
  ctx.fillRect(rwyX - rwyW / 2, rwyTop, rwyW, rwyBot - rwyTop);

  ctx.strokeStyle = "rgba(200, 210, 200, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(rwyX, rwyTop + 20);
  ctx.lineTo(rwyX, rwyBot - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(200, 210, 200, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rwyX - rwyW / 2, rwyTop);
  ctx.lineTo(rwyX - rwyW / 2, rwyBot);
  ctx.moveTo(rwyX + rwyW / 2, rwyTop);
  ctx.lineTo(rwyX + rwyW / 2, rwyBot);
  ctx.stroke();

  ctx.fillStyle = "rgba(200, 210, 200, 0.35)";
  for (var t = -1; t <= 1; t += 2) {
    ctx.fillRect(rwyX + t * 5 - 2, rwyTop + 8, 4, 12);
    ctx.fillRect(rwyX + t * 5 - 2, rwyBot - 20, 4, 12);
  }

  ctx.fillStyle = "rgba(56, 224, 138, 0.7)";
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("18", rwyX, rwyTop - 14);
  ctx.fillText("36", rwyX, rwyBot + 14);

  // --- taxiway F (break point sits beside it) ---
  ctx.strokeStyle = "rgba(120, 150, 135, 0.5)";
  ctx.lineWidth = 6;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(rwyX + rwyW / 2, BREAK_POINT.y);
  ctx.lineTo(272, BREAK_POINT.y);
  ctx.stroke();
  ctx.fillStyle = "rgba(120, 150, 135, 0.7)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TWY F", 240, BREAK_POINT.y - 12);

  // --- flight path, one polyline per phase ---
  BREAK_PHASE_PATHS.forEach(function (pathPts, idx) {
    var active = idx === currentIndex;
    ctx.strokeStyle = active ? "rgba(157, 255, 206, 0.7)" : "rgba(37, 208, 125, 0.25)";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash(active ? [] : [8, 6]);
    ctx.beginPath();
    ctx.moveTo(pathPts[0].x, pathPts[0].y);
    for (var i = 1; i < pathPts.length; i++) ctx.lineTo(pathPts[i].x, pathPts[i].y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // --- break point marker over TWY F ---
  ctx.strokeStyle = "rgba(255, 210, 120, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(BREAK_POINT.x - 7, BREAK_POINT.y - 7);
  ctx.lineTo(BREAK_POINT.x + 7, BREAK_POINT.y + 7);
  ctx.moveTo(BREAK_POINT.x + 7, BREAK_POINT.y - 7);
  ctx.lineTo(BREAK_POINT.x - 7, BREAK_POINT.y + 7);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 210, 120, 0.9)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Break Point", BREAK_POINT.x - 12, BREAK_POINT.y);

  // --- leg labels ---
  ctx.fillStyle = "rgba(111, 130, 120, 0.7)";
  ctx.font = "11px 'Segoe UI', sans-serif";

  // initial and final share the runway centerline
  ctx.save();
  ctx.translate(184, 500);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("INITIAL / FINAL", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(340, 425);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("DOWNWIND", 0, 0);
  ctx.restore();

  // --- title ---
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VTCC — Overhead Break (RWY 36)", 20, 28);

  // --- compass rose ---
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  var cx = w - 40, cy = 40;
  ctx.fillText("N", cx, cy - 18);
  ctx.strokeStyle = "rgba(56, 224, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 4, cy - 4);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 4, cy - 4);
  ctx.stroke();

  // --- aircraft blip ---
  var pos = BREAK_BLIP_POSITIONS[currentIndex];
  var phase = phases[currentIndex];

  ctx.fillStyle = "#9dffce";
  ctx.shadowColor = "#38e08a";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  var tagLeft = pos.x > w - 150;
  var tagX = tagLeft ? pos.x - 20 : pos.x + 20;
  var tagY = pos.y - 30;
  var tagAlign = tagLeft ? "right" : "left";

  ctx.strokeStyle = "rgba(157, 255, 206, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tagX, tagY + 16);
  ctx.stroke();

  ctx.textAlign = tagAlign;
  ctx.fillStyle = "#c9ffe4";
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.fillText(phase.label, tagX, tagY);
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#9dffce";
  ctx.fillText("Duration: " + formatMMSS(phase.duration), tagX, tagY + 15);
}
