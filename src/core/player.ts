/* Playback engine: a real-time clock over a sequence of timed segments.
 * Views render from `elapsed` (seconds into the sequence) on every change. */

export interface Segment {
  label: string;
  duration: number; // seconds
}

export interface PhaseAt {
  index: number; // segment index
  frac: number;  // 0..1 progress through that segment
  start: number; // segment start (s)
  end: number;   // segment end (s)
}

export const SPEEDS = [1, 2, 5, 10, 20];
const SPEED_KEY = "ojtibrief.speed";

function loadSpeed(): number {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    if (SPEEDS.includes(v)) return v;
  } catch { /* storage blocked */ }
  return 5;
}

type Listener = (elapsed: number) => void;

export class Player {
  segments: Segment[];
  elapsed = 0;
  playing = false;
  loop = false;
  speed = loadSpeed();

  private listeners: Listener[] = [];
  private stateListeners: (() => void)[] = [];
  private raf = 0;
  private lastTs = 0;

  constructor(segments: Segment[]) {
    this.segments = segments;
  }

  get total(): number {
    return this.segments.reduce((s, p) => s + p.duration, 0);
  }

  /** Start time of each segment, plus the total at the end. */
  boundaries(): number[] {
    const out = [0];
    let e = 0;
    this.segments.forEach((s) => { e += s.duration; out.push(e); });
    return out;
  }

  phaseAt(t = this.elapsed): PhaseAt {
    let start = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const end = start + this.segments[i].duration;
      const last = i === this.segments.length - 1;
      if (t < end || last) {
        const d = end - start;
        const frac = d <= 0 ? 1 : Math.min(1, Math.max(0, (t - start) / d));
        return { index: i, frac, start, end };
      }
      start = end;
    }
    return { index: 0, frac: 0, start: 0, end: 0 };
  }

  /** Called with `elapsed` whenever the clock moves or the data changes. */
  onFrame(fn: Listener): void {
    this.listeners.push(fn);
  }

  /** Called when play state, speed or loop change (for the control bar). */
  onState(fn: () => void): void {
    this.stateListeners.push(fn);
  }

  emit(): void {
    this.listeners.forEach((fn) => fn(this.elapsed));
  }

  private emitState(): void {
    this.stateListeners.forEach((fn) => fn());
  }

  setSegments(segments: Segment[]): void {
    this.segments = segments;
    this.elapsed = Math.min(this.elapsed, this.total);
    this.emitState();
    this.emit();
  }

  play(): void {
    if (this.playing) return;
    if (this.elapsed >= this.total) this.elapsed = 0;
    this.playing = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    this.emitState();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emitState();
  }

  toggle(): void {
    if (this.playing) this.pause(); else this.play();
  }

  seek(t: number): void {
    this.elapsed = Math.min(this.total, Math.max(0, t));
    this.emit();
  }

  /** Jump to the next segment boundary. */
  next(): void {
    const b = this.boundaries();
    const target = b.find((x) => x > this.elapsed + 0.01);
    this.seek(target ?? this.total);
  }

  /** Jump to the start of the current segment, or the previous one when
   * already near its start (like a media player's back button). */
  prev(): void {
    const b = this.boundaries();
    let target = 0;
    for (const x of b) if (x < this.elapsed - 1) target = x;
    this.seek(target);
  }

  reset(): void {
    this.pause();
    this.seek(0);
  }

  setSpeed(v: number): void {
    this.speed = v;
    try { localStorage.setItem(SPEED_KEY, String(v)); } catch { /* storage blocked */ }
    this.emitState();
  }

  setLoop(v: boolean): void {
    this.loop = v;
    this.emitState();
  }

  private tick = (ts: number): void => {
    if (!this.playing) return;
    const dt = Math.min(0.25, (ts - this.lastTs) / 1000); // clamp after background tabs
    this.lastTs = ts;
    this.elapsed += dt * this.speed;
    if (this.elapsed >= this.total) {
      if (this.loop && this.total > 0) {
        this.elapsed %= this.total;
      } else {
        this.elapsed = this.total;
        this.emit();
        this.pause();
        return;
      }
    }
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  };
}
