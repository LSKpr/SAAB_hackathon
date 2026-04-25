import { useSimStore } from "./store";

const TICK_MS = 200;
// Real seconds elapsed during one tick → sim minutes advanced. The "1×" speed
// runs the simulation faster than wall clock so the demo is watchable; the
// scenario `durationMin` (e.g. 30) plays out in roughly 60s of real time at 1×.
const REAL_SEC_TO_SIM_MIN = 0.5;
const TICK_DT_MIN = (TICK_MS / 1000) * REAL_SEC_TO_SIM_MIN;

let interval: number | null = null;

export function startTickLoop() {
  if (interval !== null) return;
  interval = window.setInterval(() => {
    useSimStore.getState().tick(TICK_DT_MIN);
  }, TICK_MS);
}

export function stopTickLoop() {
  if (interval !== null) {
    window.clearInterval(interval);
    interval = null;
  }
}
