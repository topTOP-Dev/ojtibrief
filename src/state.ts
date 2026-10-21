/* Live app data shared by every view and the config editor.
 * Views subscribe with onStateChange() and re-time their players on edits. */

import {
  breakStore, circuitStore, groundStore, loadTimings,
  type DurationData,
} from "./config";

export const state: DurationData = {
  timings: loadTimings(),
  ground: groundStore.load(),
  circuit: circuitStore.load(),
  break: breakStore.load(),
};

type Listener = () => void;
const listeners: Listener[] = [];

export function onStateChange(fn: Listener): void {
  listeners.push(fn);
}

export function setState(partial: Partial<DurationData>): void {
  Object.assign(state, partial);
  listeners.forEach((fn) => fn());
}

/** Re-reads every data set (localStorage, else built-in defaults). */
export function reloadState(): void {
  setState({
    timings: loadTimings(),
    ground: groundStore.load(),
    circuit: circuitStore.load(),
    break: breakStore.load(),
  });
}
