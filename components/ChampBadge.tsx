import { championIcon } from "@/lib/assets";

export function ChampBadge({
  championId,
  name,
  sub,
  small,
}: {
  championId: number;
  name: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className={`champ ${small ? "sm" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={championIcon(championId)} alt={name} loading="lazy" />
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
      </div>
    </div>
  );
}
