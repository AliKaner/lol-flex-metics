export const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
export const num = (x: number, d = 1) => x.toFixed(d);

export function kdaStr(p: {
  kills: number;
  deaths: number;
  assists: number;
}) {
  return `${p.kills}/${p.deaths}/${p.assists}`;
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}g önce`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}sa önce`;
  const mins = Math.floor(diff / 60000);
  return `${mins}dk önce`;
}

export function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
