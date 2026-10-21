/* Shared plumbing for the animated views: stat readouts, the table drawer,
 * and wiring a Player to its control bar. */

import { byId } from "../core/canvas";
import type { Player } from "../core/player";
import { mountControls, type ControlOpts } from "../ui/controls";

export interface View {
  root: HTMLElement;
  player: Player;
}

export type StatSetter = (key: string, value: string) => void;

/** Builds labelled stat tiles in `host`; returns a setter by key. */
export function mountStats(host: HTMLElement, defs: [key: string, label: string][]): StatSetter {
  const values: Record<string, HTMLElement> = {};
  host.innerHTML = "";
  defs.forEach(([key, label]) => {
    const tile = document.createElement("div");
    tile.className = "stat";
    const l = document.createElement("span");
    l.className = "stat-label";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "stat-value";
    tile.append(l, v);
    host.appendChild(tile);
    values[key] = v;
  });
  return (key, value) => {
    const el = values[key];
    if (el.textContent !== value) el.textContent = value;
  };
}

/** Wires the player bar and the Table toggle for view `key` (ids: v-key, key-player). */
export function makeView(key: string, player: Player, opts?: ControlOpts): View {
  const root = byId("v-" + key);
  mountControls(byId(key + "-player"), player, opts);
  const btn = root.querySelector<HTMLButtonElement>(".drawer-btn");
  if (btn) {
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const open = root.classList.toggle("drawer-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("on", open);
    });
  }
  return { root, player };
}
