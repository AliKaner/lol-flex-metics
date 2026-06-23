"use client";

import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda, killParticipation, csPerMin, performanceRating } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

interface MvpEntry {
  icon: string;
  labelKey: string;
  name: string;
  value: string;
  colorClass: string;
}

export function PlayerOfTheDay({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();

  const mvps = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return null;

    const stats = users.map((user) => {
      let kills = 0, deaths = 0, assists = 0, damage = 0, vision = 0, kpSum = 0, csSum = 0;
      let wins = 0, games = 0, totalRating = 0, totalKda = 0;

      for (const match of matches) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        games++;
        kills += p.kills;
        deaths += p.deaths;
        assists += p.assists;
        damage += p.totalDamageDealtToChampions;
        vision += p.visionScore;
        kpSum += killParticipation(match, p);
        csSum += csPerMin(match, p);
        totalRating += performanceRating(match, p);
        totalKda += kda(p);
        if (p.win) wins++;
      }

      if (games === 0) return null;
      return {
        name: user.gameName,
        tag: user.tagLine,
        games,
        wins,
        avgKills: kills / games,
        avgDeaths: deaths / games,
        avgAssists: assists / games,
        avgKda: totalKda / games,
        avgDamage: damage / games,
        avgVision: vision / games,
        avgKp: kpSum / games,
        avgCs: csSum / games,
        avgRating: totalRating / games,
        winRate: wins / games,
        totalKills: kills,
        totalDeaths: deaths,
      };
    }).filter(Boolean) as NonNullable<ReturnType<typeof Object>>[];

    if (stats.length === 0) return null;

    const find = (
      fn: (s: any) => number,
      best: "max" | "min"
    ): { name: string; value: number } => {
      let result = stats[0];
      for (const s of stats) {
        if (best === "max" ? fn(s) > fn(result) : fn(s) < fn(result)) {
          result = s;
        }
      }
      return { name: result.name, value: fn(result) };
    };

    const entries: MvpEntry[] = [];

    const mvp = find((s) => s.avgRating, "max");
    entries.push({ icon: "&#9813;", labelKey: "playerOfDay.mvp", name: mvp.name, value: `${find((s) => s.avgRating, "max").name === mvp.name ? ((stats.find((s: any) => s.name === mvp.name) as any).winRate * 100).toFixed(0) + "% WR" : ""}`, colorClass: "gold" });

    const killer = find((s) => s.avgKills, "max");
    entries.push({ icon: "&#9876;", labelKey: "playerOfDay.killer", name: killer.name, value: killer.value.toFixed(1) + " kill/game", colorClass: "win" });

    const feeder = find((s) => s.avgDeaths, "max");
    entries.push({ icon: "&#9760;", labelKey: "playerOfDay.feeder", name: feeder.name, value: feeder.value.toFixed(1) + " death/game", colorClass: "loss" });

    const helper = find((s) => s.avgAssists, "max");
    entries.push({ icon: "&#9829;", labelKey: "playerOfDay.helper", name: helper.name, value: helper.value.toFixed(1) + " assist/game", colorClass: "win" });

    const damager = find((s) => s.avgDamage, "max");
    entries.push({ icon: "&#9889;", labelKey: "playerOfDay.damager", name: damager.name, value: Math.round(damager.value).toLocaleString() + " dmg/game", colorClass: "win" });

    const tank = find((s) => s.avgDeaths, "min");
    entries.push({ icon: "&#128737;", labelKey: "playerOfDay.survivor", name: tank.name, value: tank.value.toFixed(1) + " death/game", colorClass: "win" });

    const watcher = find((s) => s.avgVision, "max");
    entries.push({ icon: "&#128065;", labelKey: "playerOfDay.watcher", name: watcher.name, value: watcher.value.toFixed(1) + " vision/game", colorClass: "win" });

    const farmer = find((s) => s.avgCs, "max");
    entries.push({ icon: "&#9881;", labelKey: "playerOfDay.farmer", name: farmer.name, value: farmer.value.toFixed(1) + " cs/min", colorClass: "win" });

    return entries;
  }, [users, matches]);

  if (!mvps || mvps.length === 0) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 10,
      marginBottom: 20,
    }}>
      {mvps.map((entry, i) => (
        <div
          key={i}
          className="card"
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderTop: i === 0 ? "2px solid var(--accent)" : undefined,
          }}
        >
          <span
            style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: "center" }}
            dangerouslySetInnerHTML={{ __html: entry.icon }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted)",
            }}>
              {t(entry.labelKey)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {entry.name}
            </div>
          </div>
          <div className={entry.colorClass} style={{
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}>
            {entry.value}
          </div>
        </div>
      ))}
    </div>
  );
}
