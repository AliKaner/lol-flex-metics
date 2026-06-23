"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { comboStats } from "@/lib/analysis";
import { pct } from "@/lib/format";
import { COPY } from "@/lib/humor";

export function ComboAnalysis({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const [size, setSize] = useState<3 | 5>(3);
  const [onlyPlayed, setOnlyPlayed] = useState(true);
  const [sortBy, setSortBy] = useState<"games" | "winRate">("games");

  const stats = useMemo(
    () => comboStats(users, matches, size),
    [users, matches, size]
  );

  const filtered = useMemo(() => {
    const list = onlyPlayed ? stats : stats; // comboStats zaten games>0 döndürür
    return [...list].sort((a, b) =>
      sortBy === "games"
        ? b.games - a.games || b.winRate - a.winRate
        : b.winRate - a.winRate || b.games - a.games
    );
  }, [stats, sortBy, onlyPlayed]);

  if (users.length < size) {
    return (
      <div className="empty">
        {size}&apos;li kombinasyon için en az {size} oyuncu ekle. (Şu an{" "}
        {users.length})
      </div>
    );
  }

  return (
    <div>
      <h2>Hangi kadro carry, hangisi sirk</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {COPY.comboSub} Eklenen oyuncuların tüm {size}&apos;li kombinasyonları
        arasından, <strong>aynı takımda birlikte oynadıkları</strong> flex 5v5
        maçları.
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value) as 3 | 5)}
        >
          <option value={3}>3&apos;lü kombinasyonlar</option>
          <option value={5}>5&apos;li kombinasyonlar</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "games" | "winRate")}>
          <option value="games">Maç sayısına göre</option>
          <option value="winRate">Winrate&apos;e göre</option>
        </select>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyPlayed}
            onChange={(e) => setOnlyPlayed(e.target.checked)}
            style={{ width: 16 }}
          />
          <span className="muted">Sadece birlikte oynayanlar</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          Bu boyutta birlikte oynanmış maç bulunamadı.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Takım</th>
              <th>Birlikte maç</th>
              <th>Galibiyet</th>
              <th>Winrate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td>{c.members.map((m) => m.gameName).join(" + ")}</td>
                <td>{c.games}</td>
                <td>
                  <span className="win">{c.wins}</span> /{" "}
                  <span className="loss">{c.games - c.wins}</span>
                </td>
                <td className={c.winRate >= 0.5 ? "win" : "loss"}>
                  {pct(c.winRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
