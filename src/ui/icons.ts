/* Lucide icons, bundled (no CDN). Static markup uses <i data-lucide="name">;
 * dynamic UI calls icon(). Only the icons listed here end up in the build. */

import {
  ArrowLeftRight, BookOpen, Clock, FileDown, Gauge, ListOrdered, Pause, Plane, PlaneLanding,
  PlaneTakeoff, Play, Radar, Repeat, RotateCcw, Save, Settings, SkipBack, SkipForward, Table,
  TowerControl, Undo2, X, createElement, createIcons, type IconNode,
} from "lucide";

const ICONS: Record<string, IconNode> = {
  "arrow-left-right": ArrowLeftRight,
  "book-open": BookOpen,
  clock: Clock,
  "file-down": FileDown,
  gauge: Gauge,
  "list-ordered": ListOrdered,
  pause: Pause,
  plane: Plane,
  "plane-landing": PlaneLanding,
  "plane-takeoff": PlaneTakeoff,
  play: Play,
  radar: Radar,
  repeat: Repeat,
  "rotate-ccw": RotateCcw,
  save: Save,
  settings: Settings,
  "skip-back": SkipBack,
  "skip-forward": SkipForward,
  table: Table,
  "tower-control": TowerControl,
  "undo-2": Undo2,
  x: X,
};

export function icon(name: keyof typeof ICONS | string, size = 18): SVGElement {
  return createElement(ICONS[name], { width: size, height: size, "aria-hidden": "true", class: "lucide" });
}

/** Replaces every <i data-lucide="…"> under `root` with its SVG. */
export function hydrateIcons(root: Element | Document = document): void {
  const icons: Record<string, IconNode> = {};
  // createIcons looks names up in PascalCase.
  Object.entries(ICONS).forEach(([k, v]) => {
    icons[k.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())] = v;
  });
  createIcons({ icons, root, attrs: { width: 18, height: 18, "aria-hidden": "true" } });
}
