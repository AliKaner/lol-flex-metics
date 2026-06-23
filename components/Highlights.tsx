"use client";

import { useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { ratedMatchesForUser, kda, killParticipation, csPerMin } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { duration, kdaStr, num, timeAgo } from "@/lib/format";

function MatchRow({ match, p }: { match: Match; p: MatchParticipant }) {
  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid var(--${p.win ? "win" : "loss"})`,
      }}
    >
      <div className="stat-line">
        <ChampBadge
          championId={p.championId}
          name={p.championName}
          small
          sub={`${p.teamPosition || ""} · ${duration(match.info.gameDuration)}`}
        />
        <span className={`badge ${p.win ? "win" : "loss"}`}>
          {p.win ? "Galibiyet" : "Mağlubiyet"}
        </span>
      </div>
      <div className="row" style={{ marginTop: 10, gap: 16 }}>
        <span>
          <strong>{kdaStr(p)}</strong>{" "}
          <span className="muted">({num(kda(p), 2)} KDA)</span>
        </span>
        <span className="muted">KP {Math.round(killParticipation(match, p) * 100)}%</span>
        <span className="muted">CS/dk {num(csPerMin(match, p), 1)}</span>
        <span className="muted">{timeAgo(match.info.gameCreation)}</span>
      </div>
    </div>
  );
}

export function Highlights({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const [puuid, setPuuid] = useState(users[0]?.puuid ?? "");
  const user = users.find((u) => u.puuid === puuid) ?? users[0];

  if (!user) return <div className="empty">Önce oyuncu ekle.</div>;

  const rated = ratedMatchesForUser(matches, user.puuid);
  const best = rated.slice(0, 3);
  const worst = rated.slice(-3).reverse();

  return (
    <div>
      <h2>En iyi & en kötü maçlar</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        Performans puanına göre (KDA, kill katılımı, CS/dk, sonuç, multikill).
        Sadece flex 5v5.
      </p>

      <select
        value={user.puuid}
        onChange={(e) => setPuuid(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        {users.map((u) => (
          <option key={u.puuid} value={u.puuid}>
            {u.gameName}#{u.tagLine}
          </option>
        ))}
      </select>

      {rated.length === 0 ? (
        <div className="empty">Bu oyuncu için flex 5v5 maçı yok.</div>
      ) : (
        <div className="grid cols-2">
          <div>
            <h3 className="win">🏆 En iyi maçlar</h3>
            <div className="grid">
              {best.map((r) => (
                <MatchRow key={r.match.metadata.matchId} match={r.match} p={r.p} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="loss">💀 En kötü maçlar</h3>
            <div className="grid">
              {worst.map((r) => (
                <MatchRow key={r.match.metadata.matchId} match={r.match} p={r.p} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
