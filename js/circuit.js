/* Traffic circuit (pattern) diagram for VTCC RWY 36.
 * Right-hand pattern: upwind N, crosswind E, downwind S, base W, final N. */

const CIRCUIT_BLIP_POSITIONS = [
  { x: 460, y: 300 },  // Downwind — mid-right, heading south
  { x: 330, y: 500 },  // Base — mid-bottom, heading west
  { x: 200, y: 470 },  // Final — short final, heading north
  { x: 200, y: 200 },  // Upwind — climbing north
  { x: 330, y: 100 },  // Crosswind — mid-top, heading east
];

function drawCircuit(ctx, phases, currentIndex) {
  var w = ctx.canvas.width;
  var h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#0a100c";
  ctx.fillRect(0, 0, w, h);

  // --- runway 18/36 ---
  var rwyX = 200;
  var rwyW = 24;
  var rwyTop = 160;
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

  // --- traffic pattern path (right-hand) ---
  var patLeft = rwyX;
  var patRight = 460;
  var patTop = 100;
  var patBot = 500;

  var segments = [
    [patRight, patTop, patRight, patBot],
    [patRight, patBot, patLeft, patBot],
    [patLeft, patBot, patLeft, rwyBot],
    [patLeft, rwyBot, patLeft, patTop],
    [patLeft, patTop, patRight, patTop],
  ];

  segments.forEach(function (seg, idx) {
    var active = idx === currentIndex;
    ctx.strokeStyle = active ? "rgba(157, 255, 206, 0.7)" : "rgba(37, 208, 125, 0.25)";
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.setLineDash(active ? [] : [8, 6]);
    ctx.beginPath();
    ctx.moveTo(seg[0], seg[1]);
    ctx.lineTo(seg[2], seg[3]);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // --- direction arrows ---
  var arrows = [
    { x: patRight, y: 380, a: Math.PI },
    { x: 280, y: patBot, a: -Math.PI / 2 },
    { x: patLeft, y: 460, a: 0 },
    { x: patLeft, y: 280, a: 0 },
    { x: 370, y: patTop, a: Math.PI / 2 },
  ];

  arrows.forEach(function (ar, idx) {
    ctx.save();
    ctx.translate(ar.x, ar.y);
    ctx.rotate(ar.a);
    ctx.fillStyle = idx === currentIndex
      ? "rgba(157, 255, 206, 0.8)"
      : "rgba(37, 208, 125, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // --- leg labels ---
  ctx.fillStyle = "rgba(111, 130, 120, 0.7)";
  ctx.font = "11px 'Segoe UI', sans-serif";

  ctx.save();
  ctx.translate(patRight + 18, (patTop + patBot) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("DOWNWIND", 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillText("BASE", (patLeft + patRight) / 2, patBot + 18);

  ctx.save();
  ctx.translate(patLeft - 24, (patBot + rwyBot) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("FINAL", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(patLeft - 24, (patTop + rwyTop) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("UPWIND", 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillText("CROSSWIND", (patLeft + patRight) / 2, patTop - 14);

  // --- VTCC label ---
  ctx.fillStyle = "rgba(56, 224, 138, 0.5)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VTCC — Traffic Circuit (RWY 36)", 20, 28);

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
  var pos = CIRCUIT_BLIP_POSITIONS[currentIndex];
  var phase = phases[currentIndex];

  ctx.fillStyle = "#9dffce";
  ctx.shadowColor = "#38e08a";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  var tagX = currentIndex === 0 ? pos.x - 20 : pos.x + 20;
  var tagY = pos.y - 30;
  var tagAlign = currentIndex === 0 ? "right" : "left";

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
