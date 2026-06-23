"use client";

import { useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { championLeaderboard } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { num, pct } from "@/lib/format";

export function ChampionLeaderboard({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const [q, setQ] = useState("");
  const rows = championLeaderboard(users, matches).filter((r) =>
    r.championName.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <h2>Şampiyon bazlı sıralama</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        Her şampiyonun altında, o şampiyonu oynayan oyuncular başarılarına göre
        sıralanır.
      </p>
      <input
        placeholder="Şampiyon ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16, width: 240 }}
      />

      {rows.length === 0 && <div className="empty">Veri yok.</div>}

      <div className="grid cols-2">
        {rows.map((row) => (
          <div className="card" key={row.championName}>
            <ChampBadge
              championId={row.championId}
              name={row.championName}
              sub={`${row.entries.length} oyuncu oynadı`}
            />
            <table style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Oyuncu</th>
                  <th>Maç</th>
                  <th>WR</th>
                  <th>KDA</th>
                </tr>
              </thead>
              <tbody>
                {row.entries.map((e, i) => (
                  <tr key={e.user.puuid}>
                    <td className="gold">{i + 1}</td>
                    <td>{e.user.gameName}</td>
                    <td>{e.stat.games}</td>
                    <td className={e.stat.winRate >= 0.5 ? "win" : "loss"}>
                      {pct(e.stat.winRate)}
                    </td>
                    <td>{num(e.stat.avgKda, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
