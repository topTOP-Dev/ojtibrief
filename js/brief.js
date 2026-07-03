/* Slide presentation for the Brief tab.
 * Loads MD files listed in briefs/manifest.json.
 * Slides are separated by a --- line within each file.
 * Requires a web server (fetch); does not work via file:// protocol. */

const Brief = (function () {
  var decks = [];
  var slides = [];
  var currentSlide = 0;

  // --- Mini Markdown renderer ---

  function esc(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inlineMd(text) {
    return esc(text)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
        '<img class="brief-img" src="$2" alt="$1">')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  function renderTable(tableLines) {
    var rows = tableLines
      .filter(function (l) { return !l.match(/^[\s|:-]+$/); })
      .map(function (l) {
        return l.split('|').slice(1, -1).map(function (c) { return c.trim(); });
      });
    if (!rows.length) return '';
    var header = rows[0];
    var body = rows.slice(1);
    var html = '<table class="brief-table"><thead><tr>';
    header.forEach(function (c) { html += '<th>' + inlineMd(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    body.forEach(function (row) {
      html += '<tr>';
      row.forEach(function (c) { html += '<td>' + inlineMd(c) + '</td>'; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderMd(src) {
    var lines = src.split('\n');
    var out = '';
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // Heading
      var hMatch = line.match(/^(#{1,4})\s+(.*)/);
      if (hMatch) {
        var lvl = hMatch[1].length;
        out += '<h' + lvl + '>' + inlineMd(hMatch[2]) + '</h' + lvl + '>';
        i++; continue;
      }

      // Table (header row followed by separator row)
      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^[\s|:-]+$/)) {
        var tbl = [];
        while (i < lines.length && lines[i].includes('|')) { tbl.push(lines[i]); i++; }
        out += renderTable(tbl);
        continue;
      }

      // Unordered list
      if (line.match(/^[-*]\s/)) {
        out += '<ul>';
        while (i < lines.length && lines[i].match(/^[-*]\s/)) {
          out += '<li>' + inlineMd(lines[i].replace(/^[-*]\s/, '')) + '</li>';
          i++;
        }
        out += '</ul>';
        continue;
      }

      // Ordered list
      if (line.match(/^\d+\.\s/)) {
        out += '<ol>';
        while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
          out += '<li>' + inlineMd(lines[i].replace(/^\d+\.\s/, '')) + '</li>';
          i++;
        }
        out += '</ol>';
        continue;
      }

      // Blockquote
      if (line.match(/^>\s?/)) {
        out += '<blockquote>';
        while (i < lines.length && lines[i].match(/^>\s?/)) {
          out += '<p>' + inlineMd(lines[i].replace(/^>\s?/, '')) + '</p>';
          i++;
        }
        out += '</blockquote>';
        continue;
      }

      // Horizontal rule within a slide (*** or ___)
      if (line.match(/^(\*{3}|_{3})$/)) {
        out += '<hr>'; i++; continue;
      }

      // Empty line
      if (!line.trim()) { i++; continue; }

      // Paragraph (runs until blank line or block-level marker)
      var para = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].match(/^(#{1,4}\s|[-*]\s|\d+\.\s|>|\*{3}|_{3})/)
      ) {
        para.push(lines[i]);
        i++;
      }
      if (para.length) out += '<p>' + inlineMd(para.join(' ')) + '</p>';
    }

    return out;
  }

  // --- Slide navigation ---

  function renderSlide() {
    var el = document.getElementById('brief-slide');
    el.innerHTML = slides.length ? renderMd(slides[currentSlide]) : '';
    document.getElementById('brief-slide-area').scrollTop = 0;
    document.getElementById('brief-slide-num').textContent =
      slides.length ? (currentSlide + 1) + ' / ' + slides.length : '— / —';
    document.getElementById('btn-brief-prev').disabled = currentSlide === 0;
    document.getElementById('btn-brief-next').disabled = currentSlide >= slides.length - 1;
  }

  function next() {
    if (currentSlide < slides.length - 1) { currentSlide++; renderSlide(); }
  }

  function prev() {
    if (currentSlide > 0) { currentSlide--; renderSlide(); }
  }

  function loadDeck(idx) {
    var deck = decks[idx];
    if (!deck) return;
    currentSlide = 0;
    document.getElementById('brief-deck-select').value = idx;

    fetch(deck.file)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        slides = text
          .split(/\r?\n---\r?\n/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        renderSlide();
      })
      .catch(function () {
        slides = [];
        document.getElementById('brief-slide').innerHTML =
          '<p class="brief-error">Could not load <em>' + esc(deck.file) + '</em>.<br>' +
          'Serve the app with a web server: <code>python3 -m http.server</code></p>';
        document.getElementById('brief-slide-num').textContent = '— / —';
      });
  }

  // --- Image lightbox (click to zoom / pan) ---

  var lb = {};

  function buildLightbox() {
    var overlay = document.createElement('div');
    overlay.className = 'brief-lightbox';
    overlay.innerHTML =
      '<div class="brief-lb-controls">' +
      '<button type="button" data-lb="out" title="Zoom out">&minus;</button>' +
      '<button type="button" data-lb="reset" title="Reset">1:1</button>' +
      '<button type="button" data-lb="in" title="Zoom in">+</button>' +
      '<button type="button" data-lb="close" title="Close">&times;</button>' +
      '</div>' +
      '<img class="brief-lb-img" alt="">';
    document.body.appendChild(overlay);

    lb.overlay = overlay;
    lb.img = overlay.querySelector('.brief-lb-img');
    lb.scale = 1; lb.tx = 0; lb.ty = 0;
    lb.dragging = false; lb.sx = 0; lb.sy = 0;

    function apply() {
      lb.img.style.transform =
        'translate(' + lb.tx + 'px,' + lb.ty + 'px) scale(' + lb.scale + ')';
    }

    function zoomAt(factor, cx, cy) {
      var rect = lb.img.getBoundingClientRect();
      // Point on the image (in its untranslated space) under the cursor
      var ox = (cx - rect.left - rect.width / 2) / lb.scale;
      var oy = (cy - rect.top - rect.height / 2) / lb.scale;
      var next = Math.min(8, Math.max(1, lb.scale * factor));
      if (next === lb.scale) return;
      lb.tx -= ox * (next - lb.scale);
      lb.ty -= oy * (next - lb.scale);
      lb.scale = next;
      if (lb.scale === 1) { lb.tx = 0; lb.ty = 0; }
      apply();
    }

    function reset() { lb.scale = 1; lb.tx = 0; lb.ty = 0; apply(); }

    lb.open = function (src, alt) {
      lb.img.src = src;
      lb.img.alt = alt || '';
      reset();
      overlay.classList.add('open');
    };
    lb.close = function () {
      overlay.classList.remove('open');
      lb.img.src = '';
    };

    overlay.addEventListener('click', function (e) {
      var action = e.target.getAttribute && e.target.getAttribute('data-lb');
      if (action === 'in') zoomAt(1.25, innerWidth / 2, innerHeight / 2);
      else if (action === 'out') zoomAt(0.8, innerWidth / 2, innerHeight / 2);
      else if (action === 'reset') reset();
      else if (action === 'close' || e.target === overlay) lb.close();
    });

    overlay.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY);
    }, { passive: false });

    lb.img.addEventListener('pointerdown', function (e) {
      if (lb.scale === 1) return;
      lb.dragging = true;
      lb.sx = e.clientX - lb.tx;
      lb.sy = e.clientY - lb.ty;
      lb.img.setPointerCapture(e.pointerId);
    });
    lb.img.addEventListener('pointermove', function (e) {
      if (!lb.dragging) return;
      lb.tx = e.clientX - lb.sx;
      lb.ty = e.clientY - lb.sy;
      apply();
    });
    lb.img.addEventListener('pointerup', function () { lb.dragging = false; });
    lb.img.addEventListener('dblclick', function (e) {
      if (lb.scale > 1) reset(); else zoomAt(2, e.clientX, e.clientY);
    });
  }

  function init() {
    buildLightbox();

    document.getElementById('brief-slide').addEventListener('click', function (e) {
      if (e.target.classList.contains('brief-img')) {
        lb.open(e.target.src, e.target.alt);
      }
    });

    document.getElementById('btn-brief-next').addEventListener('click', next);
    document.getElementById('btn-brief-prev').addEventListener('click', prev);

    document.getElementById('brief-deck-select').addEventListener('change', function () {
      loadDeck(parseInt(this.value, 10));
    });

    document.addEventListener('keydown', function (e) {
      if (lb.overlay && lb.overlay.classList.contains('open')) {
        if (e.key === 'Escape') { e.preventDefault(); lb.close(); }
        return;
      }
      if (!document.getElementById('tab-brief').classList.contains('active')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    fetch('briefs/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        decks = data;
        var sel = document.getElementById('brief-deck-select');
        sel.innerHTML = '';
        decks.forEach(function (deck, i) {
          var opt = document.createElement('option');
          opt.value = i;
          opt.textContent = deck.title;
          sel.appendChild(opt);
        });
        loadDeck(0);
      })
      .catch(function () {
        document.getElementById('brief-slide').innerHTML =
          '<p class="brief-error">Could not load briefing manifest.<br>' +
          'Serve the app with a web server: <code>python3 -m http.server</code></p>';
      });
  }

  return { init: init };
})();
