"use client";

import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

export function QuickStats({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return null;

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalWins = 0;
    let totalGames = 0;
    let maxKda = { value: 0, name: "" };
    let maxKills = { value: 0, name: "", champ: "" };
    let longestGame = 0;
    let pentakills = 0;

    for (const match of matches) {
      for (const user of users) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        totalKills += p.kills;
        totalDeaths += p.deaths;
        totalAssists += p.assists;
        if (p.win) totalWins++;
        totalGames++;

        const playerKda = kda(p);
        if (playerKda > maxKda.value) {
          maxKda = { value: playerKda, name: user.gameName };
        }

        if (p.kills > maxKills.value) {
          maxKills = { value: p.kills, name: user.gameName, champ: p.championName };
        }

        if (p.pentaKills > 0) pentakills += p.pentaKills;
      }

      if (match.info.gameDuration > longestGame) {
        longestGame = match.info.gameDuration;
      }
    }

    const avgKda = totalDeaths > 0 ? (totalKills + totalAssists) / totalDeaths : 0;
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    return {
      totalMatches: matches.length,
      totalKills,
      totalDeaths,
      avgKda: avgKda.toFixed(2),
      winRate: winRate.toFixed(0),
      maxKills,
      pentakills,
      longestGame: Math.floor(longestGame / 60),
    };
  }, [users, matches]);

  if (!stats) return null;

  return (
    <div className="quick-stats">
      <div className="quick-stat">
        <div className="stat-icon">&#9876;</div>
        <div className="stat-value">{stats.totalMatches}</div>
        <div className="stat-label">{t("quickStats.totalMatches")}</div>
      </div>
      <div className="quick-stat">
        <div className="stat-icon">&#9760;</div>
        <div className="stat-value">{stats.totalKills}</div>
        <div className="stat-label">{t("quickStats.totalKills")}</div>
      </div>
      <div className="quick-stat">
        <div className="stat-icon">&#9733;</div>
        <div className="stat-value">{stats.avgKda}</div>
        <div className="stat-label">{t("quickStats.avgKda")}</div>
      </div>
      <div className="quick-stat">
        <div className="stat-icon" style={{ color: Number(stats.winRate) >= 50 ? "var(--win)" : "var(--loss)" }}>&#9830;</div>
        <div className="stat-value" style={{ color: Number(stats.winRate) >= 50 ? "var(--win)" : "var(--loss)" }}>{stats.winRate}%</div>
        <div className="stat-label">{t("quickStats.winRate")}</div>
      </div>
      {stats.pentakills > 0 && (
        <div className="quick-stat" style={{ borderTopColor: "var(--accent)" }}>
          <div className="stat-icon">&#9813;</div>
          <div className="stat-value gold">{stats.pentakills}</div>
          <div className="stat-label">{t("quickStats.pentakills")}</div>
        </div>
      )}
    </div>
  );
}
