"use client";

import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { findParticipant, kda, killParticipation, csPerMin } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

interface PlayerAverages {
  puuid: string;
  name: string;
  games: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgDamage: number;
  avgCs: number;
  avgVision: number;
  avgKp: number;
  winRate: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  maxKillsGame: number;
  maxDeathsGame: number;
  maxDamageGame: number;
}

interface StatCategory {
  key: string;
  icon: string;
  getValue: (p: PlayerAverages) => number;
  format: (v: number) => string;
  best: "max" | "min";
  colorClass: string;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export function StatLeaders({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();

  const playerStats = useMemo(() => {
    if (matches.length === 0 || users.length === 0) return [];

    return users.map((user) => {
      let kills = 0, deaths = 0, assists = 0, damage = 0, cs = 0, vision = 0, kp = 0;
      let wins = 0, games = 0;
      let maxKills = 0, maxDeaths = 0, maxDamage = 0;
      const kdaValues: number[] = [];

      for (const match of matches) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        games++;
        kills += p.kills;
        deaths += p.deaths;
        assists += p.assists;
        damage += p.totalDamageDealtToChampions;
        cs += csPerMin(match, p);
        vision += p.visionScore;
        kp += killParticipation(match, p);
        if (p.win) wins++;
        kdaValues.push(kda(p));
        if (p.kills > maxKills) maxKills = p.kills;
        if (p.deaths > maxDeaths) maxDeaths = p.deaths;
        if (p.totalDamageDealtToChampions > maxDamage) maxDamage = p.totalDamageDealtToChampions;
      }

      if (games === 0) return null;

      return {
        puuid: user.puuid,
        name: user.gameName,
        games,
        avgKills: kills / games,
        avgDeaths: deaths / games,
        avgAssists: assists / games,
        avgKda: kdaValues.reduce((a, b) => a + b, 0) / games,
        avgDamage: damage / games,
        avgCs: cs / games,
        avgVision: vision / games,
        avgKp: kp / games,
        winRate: wins / games,
        totalKills: kills,
        totalDeaths: deaths,
        totalAssists: assists,
        maxKillsGame: maxKills,
        maxDeathsGame: maxDeaths,
        maxDamageGame: maxDamage,
      } as PlayerAverages;
    }).filter(Boolean) as PlayerAverages[];
  }, [users, matches]);

  const categories: StatCategory[] = useMemo(() => [
    { key: "avgKills", icon: "&#9876;", getValue: (p) => p.avgKills, format: (v) => v.toFixed(1), best: "max", colorClass: "win" },
    { key: "avgDeaths", icon: "&#9760;", getValue: (p) => p.avgDeaths, format: (v) => v.toFixed(1), best: "min", colorClass: "loss" },
    { key: "avgAssists", icon: "&#9829;", getValue: (p) => p.avgAssists, format: (v) => v.toFixed(1), best: "max", colorClass: "win" },
    { key: "avgKda", icon: "&#9733;", getValue: (p) => p.avgKda, format: (v) => v.toFixed(2), best: "max", colorClass: "gold" },
    { key: "avgDamage", icon: "&#9889;", getValue: (p) => p.avgDamage, format: (v) => Math.round(v).toLocaleString(), best: "max", colorClass: "win" },
    { key: "avgCs", icon: "&#9881;", getValue: (p) => p.avgCs, format: (v) => v.toFixed(1), best: "max", colorClass: "win" },
    { key: "avgVision", icon: "&#128065;", getValue: (p) => p.avgVision, format: (v) => v.toFixed(1), best: "max", colorClass: "win" },
    { key: "avgKp", icon: "&#9878;", getValue: (p) => p.avgKp * 100, format: (v) => v.toFixed(0) + "%", best: "max", colorClass: "win" },
    { key: "winRate", icon: "&#9830;", getValue: (p) => p.winRate * 100, format: (v) => v.toFixed(0) + "%", best: "max", colorClass: "win" },
    { key: "maxKillsGame", icon: "&#128481;", getValue: (p) => p.maxKillsGame, format: (v) => v.toString(), best: "max", colorClass: "gold" },
    { key: "maxDeathsGame", icon: "&#128128;", getValue: (p) => p.maxDeathsGame, format: (v) => v.toString(), best: "max", colorClass: "loss" },
    { key: "maxDamageGame", icon: "&#128293;", getValue: (p) => p.maxDamageGame, format: (v) => Math.round(v).toLocaleString(), best: "max", colorClass: "gold" },
    { key: "totalKills", icon: "&#9876;", getValue: (p) => p.totalKills, format: (v) => v.toString(), best: "max", colorClass: "win" },
    { key: "totalDeaths", icon: "&#9760;", getValue: (p) => p.totalDeaths, format: (v) => v.toString(), best: "max", colorClass: "loss" },
  ], []);

  const deviations = useMemo(() => {
    if (playerStats.length < 2) return null;

    const statKeys = ["avgKills", "avgDeaths", "avgAssists", "avgKda", "avgDamage", "avgCs", "avgVision", "avgKp"] as const;
    const result: Record<string, { mean: number; std: number; players: { name: string; value: number; zScore: number }[] }> = {};

    for (const key of statKeys) {
      const values = playerStats.map((p) => {
        if (key === "avgKp") return p.avgKp * 100;
        return p[key];
      });
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = stdDev(values);

      const players = playerStats.map((p, i) => ({
        name: p.name,
        value: values[i],
        zScore: std > 0 ? (values[i] - mean) / std : 0,
      })).sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

      result[key] = { mean, std, players };
    }

    return result;
  }, [playerStats]);

  if (playerStats.length === 0) return null;

  return (
    <div>
      {/* Stat Leaders */}
      <h2>{t("statLeaders.title")}</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        {t("statLeaders.subtitle")}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginBottom: 32,
      }}>
        {categories.map((cat) => {
          const sorted = [...playerStats].sort((a, b) => {
            const va = cat.getValue(a);
            const vb = cat.getValue(b);
            return cat.best === "max" ? vb - va : va - vb;
          });
          const leader = sorted[0];
          if (!leader) return null;
          const val = cat.getValue(leader);

          return (
            <div
              key={cat.key}
              className="card"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}
                dangerouslySetInnerHTML={{ __html: cat.icon }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                  marginBottom: 2,
                }}>
                  {t(`statLeaders.${cat.key}`)}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {leader.name}
                </div>
              </div>
              <div className={cat.colorClass} style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 900,
                flexShrink: 0,
                textAlign: "right",
              }}>
                {cat.format(val)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Standard Deviations */}
      {deviations && playerStats.length >= 2 && (
        <>
          <h2>{t("statLeaders.deviationTitle")}</h2>
          <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
            {t("statLeaders.deviationSubtitle")}
          </p>

          <div className="grid cols-2">
            {Object.entries(deviations).map(([key, data]) => (
              <div className="card" key={key} style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>
                    {t(`statLeaders.${key}`)}
                  </h3>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {t("statLeaders.mean")}: {data.mean.toFixed(1)} &middot; {t("statLeaders.stdDev")}: {data.std.toFixed(1)}
                  </div>
                </div>

                {data.players.map((player) => {
                  const isPositive = player.zScore > 0;
                  const absZ = Math.abs(player.zScore);
                  const barWidth = Math.min(absZ * 30, 100);
                  const isOutlier = absZ > 1.5;
                  const isExtreme = absZ > 2;

                  return (
                    <div key={player.name} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: isOutlier ? 800 : 500,
                          color: isExtreme ? (isPositive ? "var(--win)" : "var(--loss)") : "var(--text)",
                        }}>
                          {player.name}
                          {isExtreme && (
                            <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.8 }}>
                              {key === "avgDeaths"
                                ? (isPositive ? t("statLeaders.outlierBad") : t("statLeaders.outlierGood"))
                                : (isPositive ? t("statLeaders.outlierGood") : t("statLeaders.outlierBad"))}
                            </span>
                          )}
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          color: key === "avgDeaths"
                            ? (isPositive ? "var(--loss)" : "var(--win)")
                            : (isPositive ? "var(--win)" : "var(--loss)"),
                        }}>
                          {player.zScore > 0 ? "+" : ""}{player.zScore.toFixed(2)}σ
                        </span>
                      </div>
                      <div style={{
                        height: 4,
                        background: "rgba(1, 10, 19, 0.5)",
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                      }}>
                        <div style={{
                          position: "absolute",
                          left: isPositive ? "50%" : `${50 - barWidth / 2}%`,
                          width: `${barWidth / 2}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: key === "avgDeaths"
                            ? (isPositive ? "var(--loss)" : "var(--win)")
                            : (isPositive ? "var(--win)" : "var(--loss)"),
                          opacity: isOutlier ? 1 : 0.5,
                          transition: "all 0.5s ease",
                        }} />
                        <div style={{
                          position: "absolute",
                          left: "50%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "var(--muted)",
                          opacity: 0.3,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
