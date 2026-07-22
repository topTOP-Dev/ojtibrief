/* RWY 18 arrival profile rendering (dog-leg approach from the north).
 * Route entry -> threshold, airport at scope center, north = up, east = +x:
 *   TUNTU -> SUSEG -> MESUX -> PILEK -> CC181 -> RUNWAY
 * `cum` is cumulative track distance flown from TUNTU (NM).
 * Coordinates and distances per briefs/profile18.md. */

const RWY18_ROUTE = [
  { name: "TUNTU",  x: 14.0, y: 10.2, cum: 0.0,  side: "right" },
  { name: "SUSEG",  x: 14.0, y: 16.1, cum: 5.9,  side: "right" },
  { name: "MESUX",  x: 8.9,  y: 16.1, cum: 11.0, side: "top"   },
  { name: "PILEK",  x: 0.0,  y: 16.1, cum: 19.9, side: "left"  },
  { name: "CC181",  x: 0.0,  y: 7.3,  cum: 28.7, side: "left"  },
  { name: "RUNWAY", x: 0.0,  y: 0.0,  cum: 36.0, side: "left"  },
];

const RWY18_TOTAL_NM = 36.0;

/* Canvas point for a route waypoint (NM north/east -> canvas, north = up). */
function rwy18FixPoint(cx, cy, pxPerNm, fix) {
  return { x: cx + fix.x * pxPerNm, y: cy - fix.y * pxPerNm };
}

/* Canvas {x,y} for a point `cum` NM along the route from TUNTU. */
function rwy18PointAtCum(cx, cy, pxPerNm, cum) {
  cum = Math.max(0, Math.min(RWY18_TOTAL_NM, cum));
  for (var i = 0; i < RWY18_ROUTE.length - 1; i++) {
    var a = RWY18_ROUTE[i];
    var b = RWY18_ROUTE[i + 1];
    if (cum <= b.cum) {
      var seg = b.cum - a.cum;
      var f = seg === 0 ? 0 : (cum - a.cum) / seg;
      return {
        x: cx + (a.x + f * (b.x - a.x)) * pxPerNm,
        y: cy - (a.y + f * (b.y - a.y)) * pxPerNm,
      };
    }
  }
  return rwy18FixPoint(cx, cy, pxPerNm, RWY18_ROUTE[RWY18_ROUTE.length - 1]);
}

/* Draws the scope with the RWY 18 route + fixes (no aircraft). Returns geom. */
function drawRoute18Base(ctx, timings) {
  var geom = drawScopeBase(ctx, timings, { radial: false, rangeNm: COMPARE_SCOPE_RANGE_NM });
  var cx = geom.cx, cy = geom.cy, pxPerNm = geom.pxPerNm;

  // --- route polyline (TUNTU -> RUNWAY) ---
  ctx.strokeStyle = "rgba(56, 224, 138, 0.4)";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  RWY18_ROUTE.forEach(function (fix, i) {
    var p = rwy18FixPoint(cx, cy, pxPerNm, fix);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // --- named fixes (runway is the center mark, skip it) ---
  ctx.textBaseline = "middle";
  RWY18_ROUTE.forEach(function (fix) {
    if (fix.name === "RUNWAY") return;
    var p = rwy18FixPoint(cx, cy, pxPerNm, fix);
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
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    if (fix.side === "left") {
      ctx.textAlign = "right";
      ctx.fillText(fix.name, p.x - 10, p.y);
    } else if (fix.side === "top") {
      ctx.textAlign = "center";
      ctx.fillText(fix.name, p.x, p.y - 12);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(fix.name, p.x + 10, p.y);
    }
  });

  return geom;
}

/* Draws an aircraft blip + tag at `cum` NM along the route.
 * Tag shows callsign, remaining track NM to touchdown, and T-mm:ss. */
function drawRoute18Blip(ctx, geom, cum, ttt, callsign, side, color) {
  color = color || "#9dffce";
  var pos = rwy18PointAtCum(geom.cx, geom.cy, geom.pxPerNm, cum);
  var dtt = Math.max(0, RWY18_TOTAL_NM - cum);
  var left = side === "left";

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  var tagX = left ? pos.x - 18 : pos.x + 18;
  var tagY = pos.y - 26;
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
  ctx.fillText(dtt.toFixed(1) + " NM", tagX, tagY + 15);
  ctx.fillText("T-" + formatMMSS(ttt), tagX, tagY + 30);
}
