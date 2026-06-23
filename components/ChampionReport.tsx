"use client";

import type { Match, TrackedUser } from "@/types/riot";
import { userChampReport, ChampStat } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { num, pct } from "@/lib/format";
import { COPY, wrRoast } from "@/lib/humor";

function ChampMini({ label, stat, good }: { label: string; stat?: ChampStat; good: boolean }) {
  if (!stat)
    return (
      <div>
        <div className="muted" style={{ fontSize: 12 }}>{label}</div>
        <div className="muted">yeterli maç yok</div>
      </div>
    );
  return (
    <div>
      <div className={good ? "win" : "loss"} style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </div>
      <ChampBadge
        championId={stat.championId}
        name={stat.championName}
        small
        sub={`${pct(stat.winRate)} WR · ${num(stat.avgKda, 2)} KDA · ${stat.games} maç`}
      />
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        “{wrRoast(stat.winRate, stat.games)}”
      </div>
    </div>
  );
}

export function ChampionReport({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const reports = users.map((u) => userChampReport(u, matches));

  return (
    <div>
      <h2>Kim neyle tanrı, kim neyle besleme</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        Winrate'e göre (en az 2 maç oynanan şampiyonlar arasından).
      </p>
      <div className="grid cols-2">
        {reports.map((r) => (
          <div className="card" key={r.user.puuid}>
            <div className="stat-line">
              <strong>
                {r.user.gameName}
                <span className="muted"> #{r.user.tagLine}</span>
              </strong>
              <span className="muted">{r.totalGames} flex maçı</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <ChampMini label={COPY.bestChamp} stat={r.best} good />
              <ChampMini label={COPY.worstChamp} stat={r.worst} good={false} />
            </div>
            {r.champs.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  Tüm şampiyonlar ({r.champs.length})
                </summary>
                <table style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Şampiyon</th>
                      <th>Maç</th>
                      <th>WR</th>
                      <th>KDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.champs.map((c) => (
                      <tr key={c.championName}>
                        <td>{c.championName}</td>
                        <td>{c.games}</td>
                        <td className={c.winRate >= 0.5 ? "win" : "loss"}>
                          {pct(c.winRate)}
                        </td>
                        <td>{num(c.avgKda, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
