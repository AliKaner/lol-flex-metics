"use client";

import { useMemo, useState, useCallback } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda, killParticipation, csPerMin } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

interface FunFact {
  icon: string;
  text: string;
}

export function FunFacts({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();
  const [factIndex, setFactIndex] = useState(0);

  const facts = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return [];

    const result: FunFact[] = [];

    let mostDeaths = { value: 0, name: "", champ: "" };
    let mostKills = { value: 0, name: "", champ: "" };
    let bestKda = { value: 0, name: "", champ: "" };
    let worstKda = { value: Infinity, name: "", champ: "" };
    let longestGame = { duration: 0, matchId: "" };
    let shortestGame = { duration: Infinity, matchId: "" };
    let mostDamage = { value: 0, name: "", champ: "" };
    let bestVision = { value: 0, name: "", champ: "" };
    let totalPentakills = 0;
    let totalQuadrakills = 0;
    let pentaPlayer = "";

    for (const match of matches) {
      if (match.info.gameDuration > longestGame.duration) {
        longestGame = { duration: match.info.gameDuration, matchId: match.metadata.matchId };
      }
      if (match.info.gameDuration < shortestGame.duration && match.info.gameDuration > 300) {
        shortestGame = { duration: match.info.gameDuration, matchId: match.metadata.matchId };
      }

      for (const user of users) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;

        if (p.deaths > mostDeaths.value) {
          mostDeaths = { value: p.deaths, name: user.gameName, champ: p.championName };
        }
        if (p.kills > mostKills.value) {
          mostKills = { value: p.kills, name: user.gameName, champ: p.championName };
        }

        const k = kda(p);
        if (k > bestKda.value) {
          bestKda = { value: k, name: user.gameName, champ: p.championName };
        }
        if (k < worstKda.value && p.deaths > 0) {
          worstKda = { value: k, name: user.gameName, champ: p.championName };
        }

        if (p.totalDamageDealtToChampions > mostDamage.value) {
          mostDamage = { value: p.totalDamageDealtToChampions, name: user.gameName, champ: p.championName };
        }
        if (p.visionScore > bestVision.value) {
          bestVision = { value: p.visionScore, name: user.gameName, champ: p.championName };
        }

        if (p.pentaKills > 0) {
          totalPentakills += p.pentaKills;
          pentaPlayer = user.gameName;
        }
        if (p.quadraKills > 0) totalQuadrakills += p.quadraKills;
      }
    }

    if (mostKills.value > 0) {
      result.push({
        icon: "&#9876;",
        text: t("funFacts.mostKills", { name: mostKills.name, champ: mostKills.champ, kills: mostKills.value }),
      });
    }

    if (mostDeaths.value > 0) {
      result.push({
        icon: "&#9760;",
        text: t("funFacts.mostDeaths", { name: mostDeaths.name, champ: mostDeaths.champ, deaths: mostDeaths.value }),
      });
    }

    if (bestKda.value > 0) {
      result.push({
        icon: "&#9733;",
        text: t("funFacts.bestKda", { name: bestKda.name, champ: bestKda.champ, kda: bestKda.value.toFixed(1) }),
      });
    }

    if (mostDamage.value > 0) {
      result.push({
        icon: "&#9889;",
        text: t("funFacts.mostDamage", { name: mostDamage.name, champ: mostDamage.champ, damage: mostDamage.value.toLocaleString() }),
      });
    }

    if (longestGame.duration > 0) {
      const mins = Math.floor(longestGame.duration / 60);
      result.push({
        icon: "&#9200;",
        text: t("funFacts.longestGame", { minutes: mins }),
      });
    }

    if (totalPentakills > 0) {
      result.push({
        icon: "&#9813;",
        text: t("funFacts.pentakills", { name: pentaPlayer, count: totalPentakills }),
      });
    }

    if (bestVision.value > 0) {
      result.push({
        icon: "&#128065;",
        text: t("funFacts.bestVision", { name: bestVision.name, score: bestVision.value }),
      });
    }

    return result;
  }, [users, matches, t]);

  const nextFact = useCallback(() => {
    if (facts.length > 0) {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }
  }, [facts.length]);

  if (facts.length === 0) return null;

  const fact = facts[factIndex];

  return (
    <div className="fun-fact-banner" onClick={nextFact} title={t("funFacts.clickForMore")}>
      <span className="fact-icon" dangerouslySetInnerHTML={{ __html: fact.icon }} />
      <span className="fact-text" dangerouslySetInnerHTML={{ __html: fact.text }} />
    </div>
  );
}
