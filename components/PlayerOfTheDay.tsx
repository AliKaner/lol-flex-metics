"use client";

import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda, performanceRating } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

export function PlayerOfTheDay({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();

  const mvp = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return null;

    let bestPlayer = { puuid: "", score: -Infinity, wins: 0, games: 0, avgKda: 0 };

    for (const user of users) {
      let totalRating = 0;
      let totalKda = 0;
      let wins = 0;
      let games = 0;

      for (const match of matches) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        games++;
        totalRating += performanceRating(match, p);
        totalKda += kda(p);
        if (p.win) wins++;
      }

      if (games === 0) continue;

      const avgRating = totalRating / games;
      const avgKda = totalKda / games;

      if (avgRating > bestPlayer.score) {
        bestPlayer = { puuid: user.puuid, score: avgRating, wins, games, avgKda };
      }
    }

    if (bestPlayer.puuid === "") return null;

    const user = users.find((u) => u.puuid === bestPlayer.puuid);
    if (!user) return null;

    return {
      name: user.gameName,
      tag: user.tagLine,
      wins: bestPlayer.wins,
      games: bestPlayer.games,
      winRate: ((bestPlayer.wins / bestPlayer.games) * 100).toFixed(0),
      avgKda: bestPlayer.avgKda.toFixed(1),
    };
  }, [users, matches]);

  if (!mvp) return null;

  return (
    <div className="potd-banner">
      <div className="potd-icon">&#9813;</div>
      <div className="potd-info">
        <div className="potd-name">
          {mvp.name}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>#{mvp.tag}</span>
        </div>
        <div className="potd-detail">
          {t("playerOfDay.title")} &middot; {mvp.wins}W {mvp.games - mvp.wins}L &middot; {mvp.avgKda} KDA
        </div>
      </div>
      <div className="potd-stat">{mvp.winRate}%</div>
    </div>
  );
}
