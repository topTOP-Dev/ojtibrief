/* Player control bar: transport buttons, phase timeline scrubber, clock,
 * speed and (optionally) loop. One per view, bound to that view's Player. */

import { formatMMSS } from "../config";
import { SPEEDS, type Player } from "../core/player";
import { icon } from "./icons";

export interface ControlOpts {
  loop?: boolean;
}

function button(cls: string, name: string, label: string, title: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.setAttribute("aria-label", label);
  b.title = title;
  b.appendChild(icon(name, cls === "play-btn" ? 22 : 18));
  return b;
}

export function mountControls(host: HTMLElement, player: Player, opts: ControlOpts = {}): void {
  host.classList.add("player");
  host.innerHTML = "";

  const row = document.createElement("div");
  row.className = "player-row";

  const btns = document.createElement("div");
  btns.className = "player-btns";
  const reset = button("icon-btn", "rotate-ccw", "Reset", "Reset");
  const prev = button("icon-btn", "skip-back", "Previous phase", "Previous phase (←)");
  const play = button("play-btn", "play", "Play", "Play / Pause (Space)");
  const next = button("icon-btn", "skip-forward", "Next phase", "Next phase (→)");
  btns.append(reset, prev, play, next);

  const now = document.createElement("div");
  now.className = "player-now";
  const nowPhase = document.createElement("span");
  nowPhase.className = "now-phase";
  const nowTime = document.createElement("span");
  nowTime.className = "now-time";
  now.append(nowPhase, nowTime);

  const optsEl = document.createElement("div");
  optsEl.className = "player-opts";
  const speedLabel = document.createElement("label");
  speedLabel.className = "speed";
  speedLabel.title = "Playback speed";
  speedLabel.appendChild(icon("gauge", 16));
  const speed = document.createElement("select");
  speed.setAttribute("aria-label", "Playback speed");
  SPEEDS.forEach((v) => {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = v + "×";
    speed.appendChild(o);
  });
  speedLabel.appendChild(speed);
  optsEl.appendChild(speedLabel);

  let loopBtn: HTMLButtonElement | null = null;
  if (opts.loop) {
    loopBtn = button("icon-btn toggle", "repeat", "Loop", "Loop the sequence");
    optsEl.appendChild(loopBtn);
    loopBtn.addEventListener("click", () => player.setLoop(!player.loop));
  }

  row.append(btns, now, optsEl);

  const timeline = document.createElement("div");
  timeline.className = "timeline";
  const segs = document.createElement("div");
  segs.className = "timeline-segs";
  const fill = document.createElement("div");
  fill.className = "timeline-fill";
  const input = document.createElement("input");
  input.type = "range";
  input.className = "timeline-input";
  input.min = "0";
  input.step = "0.1";
  input.setAttribute("aria-label", "Timeline");
  timeline.append(segs, fill, input);

  host.append(row, timeline);

  reset.addEventListener("click", () => player.reset());
  prev.addEventListener("click", () => player.prev());
  next.addEventListener("click", () => player.next());
  play.addEventListener("click", () => player.toggle());
  speed.addEventListener("change", () => player.setSpeed(Number(speed.value)));
  input.addEventListener("input", () => player.seek(Number(input.value)));

  let segEls: HTMLElement[] = [];
  function buildSegments(): void {
    segs.innerHTML = "";
    segEls = player.segments.map((s) => {
      const el = document.createElement("div");
      el.className = "seg";
      el.style.flexGrow = String(Math.max(s.duration, 0.0001));
      el.title = s.label + " — " + formatMMSS(s.duration);
      segs.appendChild(el);
      return el;
    });
    input.max = String(player.total);
  }

  function syncState(): void {
    play.innerHTML = "";
    play.appendChild(icon(player.playing ? "pause" : "play", 22));
    play.setAttribute("aria-label", player.playing ? "Pause" : "Play");
    play.classList.toggle("playing", player.playing);
    speed.value = String(player.speed);
    if (loopBtn) {
      loopBtn.classList.toggle("on", player.loop);
      loopBtn.setAttribute("aria-pressed", String(player.loop));
    }
    if (segEls.length !== player.segments.length || input.max !== String(player.total)) buildSegments();
  }

  function syncFrame(t: number): void {
    const total = player.total;
    const at = player.phaseAt(t);
    fill.style.width = (total > 0 ? (t / total) * 100 : 0) + "%";
    input.value = String(t);
    nowPhase.textContent = player.segments[at.index]?.label ?? "";
    nowTime.textContent = formatMMSS(t) + " / " + formatMMSS(total);
    segEls.forEach((el, i) => {
      el.classList.toggle("done", i < at.index);
      el.classList.toggle("current", i === at.index);
    });
    prev.disabled = t <= 0;
    next.disabled = t >= total;
  }

  buildSegments();
  player.onState(syncState);
  player.onFrame(syncFrame);
  syncState();
  syncFrame(player.elapsed);
}
