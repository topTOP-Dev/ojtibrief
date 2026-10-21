/* Entry point: instructor mode, tab switching, view init, keyboard. */

import "./styles.css";
import { loadDefaultsFile } from "./config";
import { reloadState } from "./state";
import { hydrateIcons } from "./ui/icons";
import { initConfigEditor } from "./ui/configEditor";
import { createAda18View, createAda36View } from "./views/ada";
import { initBrief } from "./views/brief";
import type { View } from "./views/common";
import { createMix18View, createMix36View } from "./views/compare";
import { createGroundView } from "./views/ground";
import { createLocalView } from "./views/local";
import { createBreakView, createCircuitView } from "./views/pattern";

const INSTRUCTOR_KEY = "ojtibrief.instructor";

/* ?instructor=1 reveals the Config tab for this browser session; ?instructor=0 hides it. */
function initInstructorMode(): boolean {
  let on = false;
  try {
    const param = new URLSearchParams(location.search).get("instructor");
    if (param !== null) sessionStorage.setItem(INSTRUCTOR_KEY, param === "0" ? "0" : "1");
    on = sessionStorage.getItem(INSTRUCTOR_KEY) === "1";
  } catch {
    on = new URLSearchParams(location.search).get("instructor") === "1";
  }
  document.body.classList.toggle("instructor", on);
  return on;
}

let views: View[] = [];

function visibleView(): View | undefined {
  return views.find((v) => v.root.getClientRects().length > 0);
}

/* Pause everything, then redraw whichever view is now on screen. */
function onViewChange(): void {
  views.forEach((v) => v.player.pause());
  visibleView()?.player.emit();
}

function showTab(tab: string): void {
  const btn = document.querySelector<HTMLElement>(`.tab-btn[data-tab="${tab}"]`);
  if (!btn || btn.offsetParent === null) return; // unknown or hidden (Config for students)
  document.querySelectorAll<HTMLElement>(".tab-btn").forEach((b) => {
    const on = b === btn;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
  btn.scrollIntoView({ block: "nearest", inline: "nearest" });
  onViewChange();
}

function initTabs(): void {
  document.querySelectorAll<HTMLElement>(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      history.replaceState(null, "", "#" + btn.dataset.tab);
      showTab(btn.dataset.tab!);
    });
  });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  if (location.hash) showTab(location.hash.slice(1));
}

/* Sub-tabs within a tab panel (RWY 36 / RWY 18 in Mix Mode and A-D-A). */
function initSubTabs(): void {
  document.querySelectorAll(".subtabs").forEach((bar) => {
    const btns = bar.querySelectorAll<HTMLElement>(".subtab-btn");
    const section = bar.closest(".tab-panel")!;
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => b.classList.toggle("active", b === btn));
        section.querySelectorAll(".subtab-panel").forEach((p) => {
          p.classList.toggle("active", p.id === "sub-" + btn.dataset.subtab);
        });
        onViewChange();
      });
    });
  });
}

/* Space = play/pause, ←/→ = previous/next phase, Home = reset. */
function initKeyboard(): void {
  document.addEventListener("keydown", (e) => {
    const el = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (el.closest("input, select, textarea, [contenteditable]")) return;
    // a focused button / table row handles its own Space and Enter
    if (el.closest("button, tr[tabindex]") && (e.key === " " || e.key === "Enter")) return;
    const view = visibleView();
    if (!view) return;
    const p = view.player;
    if (e.key === " ") { e.preventDefault(); p.toggle(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); p.next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); p.prev(); }
    else if (e.key === "Home") { e.preventDefault(); p.reset(); }
  });
}

function init(): void {
  const instructor = initInstructorMode();
  hydrateIcons();

  views = [
    createLocalView(),
    createGroundView(),
    createMix36View(),
    createMix18View(),
    createAda36View(),
    createAda18View(),
    createCircuitView(),
    createBreakView(),
  ];
  initBrief();
  if (instructor) initConfigEditor();

  initTabs();
  initSubTabs();
  initKeyboard();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) views.forEach((v) => v.player.pause());
  });

  // Apply defaults.md once fetched; values saved in this browser still win.
  loadDefaultsFile().then((applied) => { if (applied) reloadState(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
