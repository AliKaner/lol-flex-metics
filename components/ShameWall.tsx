"use client";

import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

export function ShameWall({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();

  const shame = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return null;

    let worstPlayer = { puuid: "", deaths: 0, games: 0, avgDeaths: 0 };

    for (const user of users) {
      let totalDeaths = 0;
      let games = 0;

      for (const match of matches) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        games++;
        totalDeaths += p.deaths;
      }

      if (games < 3) continue;

      const avgDeaths = totalDeaths / games;
      if (avgDeaths > worstPlayer.avgDeaths) {
        worstPlayer = { puuid: user.puuid, deaths: totalDeaths, games, avgDeaths };
      }
    }

    if (worstPlayer.puuid === "") return null;

    const user = users.find((u) => u.puuid === worstPlayer.puuid);
    if (!user) return null;

    return {
      name: user.gameName,
      totalDeaths: worstPlayer.deaths,
      avgDeaths: worstPlayer.avgDeaths.toFixed(1),
      games: worstPlayer.games,
    };
  }, [users, matches]);

  if (!shame) return null;

  return (
    <div className="shame-wall">
      <div className="shame-icon">&#128128;</div>
      <div className="shame-text" dangerouslySetInnerHTML={{
        __html: t("shameWall.text", {
          name: shame.name,
          deaths: shame.totalDeaths,
          avg: shame.avgDeaths,
          games: shame.games
        })
      }} />
    </div>
  );
}
