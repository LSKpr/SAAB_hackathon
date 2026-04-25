/** Format a duration in sim minutes as `Xm00s`. Returns "—" for invalid. */
export function fmtMin(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—";
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}m${String(s).padStart(2, "0")}s`;
}
