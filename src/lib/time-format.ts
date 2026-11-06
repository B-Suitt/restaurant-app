const clock = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "13:42" */
export function formatClock(date: string | Date): string {
  return clock.format(new Date(date));
}

/** Tiempo transcurrido como "mm:ss" (o "h:mm:ss" sobre una hora). */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/** "hace 3 min" / "recién" */
export function formatAgo(ms: number): string {
  const min = Math.floor(ms / 60000);
  return min < 1 ? "recién" : `hace ${min} min`;
}
