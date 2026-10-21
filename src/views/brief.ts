/* Slide presentation for the Brief tab.
 * Loads MD files listed in briefs/manifest.json (served from public/).
 * Slides are separated by a --- line within each file. */

import { byId } from "../core/canvas";

interface Deck {
  title: string;
  file: string;
}

/* ---- Mini Markdown renderer ---- */

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(text: string): string {
  return esc(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img class="brief-img" src="$2" alt="$1">')
    .replace(/\[[xX]\]/g, '<input type="checkbox" class="brief-check" checked>')
    .replace(/\[ ?\]/g, '<input type="checkbox" class="brief-check">')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderTable(tableLines: string[]): string {
  const rows = tableLines
    .filter((l) => !l.match(/^[\s|:-]+$/))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  if (!rows.length) return "";
  let html = '<table class="brief-table"><thead><tr>';
  rows[0].forEach((c) => { html += "<th>" + inlineMd(c) + "</th>"; });
  html += "</tr></thead><tbody>";
  rows.slice(1).forEach((row) => {
    html += "<tr>";
    row.forEach((c) => { html += "<td>" + inlineMd(c) + "</td>"; });
    html += "</tr>";
  });
  return html + "</tbody></table>";
}

function renderMd(src: string): string {
  const lines = src.split("\n");
  let out = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const hMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (hMatch) {
      const lvl = hMatch[1].length;
      out += "<h" + lvl + ">" + inlineMd(hMatch[2]) + "</h" + lvl + ">";
      i++; continue;
    }

    // Table (header row followed by separator row)
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].match(/^[\s|:-]+$/)) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].includes("|")) { tbl.push(lines[i]); i++; }
      out += renderTable(tbl);
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      out += "<ul>";
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        out += "<li>" + inlineMd(lines[i].replace(/^[-*]\s/, "")) + "</li>";
        i++;
      }
      out += "</ul>";
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      out += "<ol>";
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        out += "<li>" + inlineMd(lines[i].replace(/^\d+\.\s/, "")) + "</li>";
        i++;
      }
      out += "</ol>";
      continue;
    }

    if (line.match(/^>\s?/)) {
      out += "<blockquote>";
      while (i < lines.length && lines[i].match(/^>\s?/)) {
        out += "<p>" + inlineMd(lines[i].replace(/^>\s?/, "")) + "</p>";
        i++;
      }
      out += "</blockquote>";
      continue;
    }

    // Horizontal rule within a slide (*** or ___)
    if (line.match(/^(\*{3}|_{3})$/)) { out += "<hr>"; i++; continue; }

    if (!line.trim()) { i++; continue; }

    // Paragraph (runs until blank line or block-level marker)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() &&
      !lines[i].match(/^(#{1,4}\s|[-*]\s|\d+\.\s|>|\*{3}|_{3})/)) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) out += "<p>" + inlineMd(para.join(" ")) + "</p>";
  }
  return out;
}

/* ---- Image lightbox (click to zoom / pan) ---- */

interface LbItem { src: string; alt: string }

function buildLightbox() {
  const overlay = document.createElement("div");
  overlay.className = "brief-lightbox";
  overlay.innerHTML =
    '<div class="brief-lb-controls">' +
    '<span class="brief-lb-count"></span>' +
    '<button type="button" data-lb="out" title="Zoom out">&minus;</button>' +
    '<button type="button" data-lb="reset" title="Reset">1:1</button>' +
    '<button type="button" data-lb="in" title="Zoom in">+</button>' +
    '<button type="button" data-lb="close" title="Close">&times;</button>' +
    "</div>" +
    '<button type="button" class="brief-lb-arrow prev" data-lb="prev" title="Previous">&lsaquo;</button>' +
    '<img class="brief-lb-img" alt="">' +
    '<button type="button" class="brief-lb-arrow next" data-lb="next" title="Next">&rsaquo;</button>';
  document.body.appendChild(overlay);

  const img = overlay.querySelector<HTMLImageElement>(".brief-lb-img")!;
  const count = overlay.querySelector<HTMLElement>(".brief-lb-count")!;
  const prevBtn = overlay.querySelector<HTMLElement>(".brief-lb-arrow.prev")!;
  const nextBtn = overlay.querySelector<HTMLElement>(".brief-lb-arrow.next")!;
  let items: LbItem[] = [];
  let index = 0;
  let scale = 1, tx = 0, ty = 0;
  let dragging = false, sx = 0, sy = 0;

  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };

  function zoomAt(factor: number, cx: number, cy: number): void {
    const rect = img.getBoundingClientRect();
    // Point on the image (in its untranslated space) under the cursor
    const ox = (cx - rect.left - rect.width / 2) / scale;
    const oy = (cy - rect.top - rect.height / 2) / scale;
    const next = Math.min(8, Math.max(1, scale * factor));
    if (next === scale) return;
    tx -= ox * (next - scale);
    ty -= oy * (next - scale);
    scale = next;
    if (scale === 1) { tx = 0; ty = 0; }
    apply();
  }

  function reset(): void { scale = 1; tx = 0; ty = 0; apply(); }

  function show(i: number): void {
    const n = items.length;
    if (!n) return;
    index = (i + n) % n;
    img.src = items[index].src;
    img.alt = items[index].alt || "";
    reset();
    const multi = n > 1;
    count.textContent = multi ? index + 1 + " / " + n : "";
    prevBtn.style.display = multi ? "" : "none";
    nextBtn.style.display = multi ? "" : "none";
  }

  const lb = {
    isOpen: () => overlay.classList.contains("open"),
    next: () => show(index + 1),
    prev: () => show(index - 1),
    open(list: LbItem[], i: number) { items = list; show(i || 0); overlay.classList.add("open"); },
    close() { overlay.classList.remove("open"); img.src = ""; },
  };

  overlay.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.getAttribute?.("data-lb");
    if (action === "in") zoomAt(1.25, innerWidth / 2, innerHeight / 2);
    else if (action === "out") zoomAt(0.8, innerWidth / 2, innerHeight / 2);
    else if (action === "reset") reset();
    else if (action === "next") lb.next();
    else if (action === "prev") lb.prev();
    else if (action === "close" || target === overlay) lb.close();
  });

  overlay.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY);
  }, { passive: false });

  img.addEventListener("pointerdown", (e) => {
    if (scale === 1) return;
    dragging = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    apply();
  });
  img.addEventListener("pointerup", () => { dragging = false; });
  img.addEventListener("dblclick", (e) => {
    if (scale > 1) reset(); else zoomAt(2, e.clientX, e.clientY);
  });

  return lb;
}

/* ---- Slides ---- */

export function initBrief(): void {
  let decks: Deck[] = [];
  let slides: string[] = [];
  let current = 0;
  const slideEl = byId("brief-slide");
  const lb = buildLightbox();
  const loadError = (what: string) =>
    '<p class="brief-error">Could not load ' + what + ".</p>";

  function renderSlide(): void {
    slideEl.innerHTML = slides.length ? renderMd(slides[current]) : "";
    byId("brief-slide-area").scrollTop = 0;
    byId("brief-slide-num").textContent = slides.length ? current + 1 + " / " + slides.length : "— / —";
    byId<HTMLButtonElement>("btn-brief-prev").disabled = current === 0;
    byId<HTMLButtonElement>("btn-brief-next").disabled = current >= slides.length - 1;
  }

  const next = () => { if (current < slides.length - 1) { current++; renderSlide(); } };
  const prev = () => { if (current > 0) { current--; renderSlide(); } };

  function loadDeck(idx: number): void {
    const deck = decks[idx];
    if (!deck) return;
    current = 0;
    byId<HTMLSelectElement>("brief-deck-select").value = String(idx);
    fetch(deck.file)
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then((text) => {
        slides = text.split(/\r?\n---\r?\n/).map((s) => s.trim()).filter(Boolean);
        renderSlide();
      })
      .catch(() => {
        slides = [];
        slideEl.innerHTML = loadError("<em>" + esc(deck.file) + "</em>");
        byId("brief-slide-num").textContent = "— / —";
      });
  }

  slideEl.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("brief-img")) return;
    const imgs = Array.from(slideEl.querySelectorAll<HTMLImageElement>(".brief-img"));
    lb.open(imgs.map((im) => ({ src: im.src, alt: im.alt })), imgs.indexOf(target as HTMLImageElement));
  });

  byId("btn-brief-next").addEventListener("click", next);
  byId("btn-brief-prev").addEventListener("click", prev);
  byId<HTMLSelectElement>("brief-deck-select").addEventListener("change", (e) => {
    loadDeck(parseInt((e.target as HTMLSelectElement).value, 10));
  });

  document.addEventListener("keydown", (e) => {
    if (lb.isOpen()) {
      if (e.key === "Escape") { e.preventDefault(); lb.close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); lb.next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); lb.prev(); }
      return;
    }
    if (!byId("tab-brief").classList.contains("active")) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  fetch("briefs/manifest.json")
    .then((r) => r.json() as Promise<Deck[]>)
    .then((data) => {
      decks = data;
      const sel = byId<HTMLSelectElement>("brief-deck-select");
      sel.innerHTML = "";
      decks.forEach((deck, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = deck.title;
        sel.appendChild(opt);
      });
      loadDeck(0);
    })
    .catch(() => { slideEl.innerHTML = loadError("the briefing manifest"); });
}
