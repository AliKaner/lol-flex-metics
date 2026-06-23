"use client";

import { useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { ratedMatchesForUser, kda, killParticipation, csPerMin } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { duration, kdaStr, num, timeAgo } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

function MatchRow({ match, p }: { match: Match; p: MatchParticipant }) {
  const { t } = useTranslation();
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
          {p.win ? t("highlights.victoryLabel") : t("highlights.defeatLabel")}
        </span>
      </div>
      <div className="row" style={{ marginTop: 10, gap: 16 }}>
        <span>
          <strong>{kdaStr(p)}</strong>{" "}
          <span className="muted">({num(kda(p), 2)} KDA)</span>
        </span>
        <span className="muted">KP {Math.round(killParticipation(match, p) * 100)}%</span>
        <span className="muted">CS/dk {num(csPerMin(match, p), 1)}</span>
        <span className="muted">{timeAgo(match.info.gameCreation, t)}</span>
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
  const { t } = useTranslation();
  const [puuid, setPuuid] = useState(users[0]?.puuid ?? "");
  const [limit, setLimit] = useState<number>(3);
  const user = users.find((u) => u.puuid === puuid) ?? users[0];

  if (!user) return <div className="empty">{t("highlights.emptyHighlights")}</div>;

  const rated = ratedMatchesForUser(matches, user.puuid);
  const best = rated.slice(0, limit);
  const worst = rated.slice(-limit).reverse();

  return (
    <div>
      <h2>{t("highlights.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("highlights.subtitle")}
      </p>

      <div className="panel flex-wrap" style={{ gap: 16, marginBottom: 20 }}>
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">{t("highlights.playerLabel")}</span>
          <select
            value={user.puuid}
            onChange={(e) => setPuuid(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.puuid} value={u.puuid}>
                {u.gameName}#{u.tagLine}
              </option>
            ))}
          </select>
        </label>

        <label className="row" style={{ gap: 8 }}>
          <span className="muted">{t("highlights.limitLabel")}</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={1000}>{t("highlights.allOption")}</option>
          </select>
        </label>
      </div>

      {rated.length === 0 ? (
        <div className="empty">{t("highlights.noMatchesUser")}</div>
      ) : (
        <div className="grid cols-2">
          <div>
            <h3 className="win">{t("highlights.bestMatches")}</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: -8 }}>
              {t("highlights.bestMatchesSub")}
            </p>
            <div className="grid">
              {best.map((r) => (
                <MatchRow key={r.match.metadata.matchId} match={r.match} p={r.p} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="loss">{t("highlights.worstMatches")}</h3>
            <p className="muted" style={{ fontSize: 12, marginTop: -8 }}>
              {t("highlights.worstMatchesSub")}
            </p>
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
