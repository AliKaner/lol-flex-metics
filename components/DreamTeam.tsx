"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser, MatchParticipant } from "@/types/riot";
import { useTranslation } from "@/lib/i18n";
import { findParticipant, kda } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { num } from "@/lib/format";

interface RoleChampStats {
  championName: string;
  championId: number;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  winRate: number;
  avgKda: number;
  score: number;
}

interface UserRolePerformance {
  user: TrackedUser;
  role: string;
  bestChamp?: RoleChampStats;
}

const ROLES = ["top", "jungle", "mid", "adc", "support"] as const;
type Role = (typeof ROLES)[number];

// Helper to normalize Riot position strings to our Role types
function getNormalizedRole(position?: string): Role | null {
  if (!position) return null;
  const pos = position.toUpperCase();
  if (pos === "TOP") return "top";
  if (pos === "JUNGLE") return "jungle";
  if (pos === "MIDDLE" || pos === "MID") return "mid";
  if (pos === "BOTTOM" || pos === "ADC") return "adc";
  if (pos === "UTILITY" || pos === "SUPPORT" || pos === "SUPP") return "support";
  return null;
}

// Generate all combinations of size K from an array
function getCombinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const combo: T[] = [];
  const rec = (start: number) => {
    if (combo.length === k) {
      res.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return res;
}

// Generate all permutations of an array
function getPermutations<T>(arr: T[]): T[][] {
  const res: T[][] = [];
  const permute = (arrToPermute: T[], memo: T[] = []) => {
    if (arrToPermute.length === 0) {
      res.push(memo);
      return;
    }
    for (let i = 0; i < arrToPermute.length; i++) {
      const curr = arrToPermute.slice();
      const next = curr.splice(i, 1);
      permute(curr.slice(), memo.concat(next));
    }
  };
  permute(arr);
  return res;
}

export function DreamTeam({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"unique" | "absolute">("unique");

  // Compile all role performance data for each user
  const userPerformanceData = useMemo(() => {
    const data: Record<string, Record<Role, RoleChampStats[]>> = {};

    users.forEach((user) => {
      data[user.puuid] = {
        top: [],
        jungle: [],
        mid: [],
        adc: [],
        support: [],
      };

      // Group matches played by this user by (role, championName)
      const userMatches = matches.filter((m) => findParticipant(m, user.puuid) !== undefined);
      const groups: Record<string, { p: MatchParticipant; matches: Match[] }> = {};

      userMatches.forEach((m) => {
        const p = findParticipant(m, user.puuid)!;
        const role = getNormalizedRole(p.teamPosition);
        if (!role) return; // skip if unidentifiable

        const groupKey = `${role}-${p.championName}`;
        if (!groups[groupKey]) {
          groups[groupKey] = { p, matches: [] };
        }
        groups[groupKey].matches.push(m);
      });

      // Calculate stats for each group
      Object.entries(groups).forEach(([key, group]) => {
        const [role] = key.split("-") as [Role, string];
        const gMatches = group.matches;
        const games = gMatches.length;
        const wins = gMatches.filter((m) => findParticipant(m, user.puuid)!.win).length;

        let totalKills = 0;
        let totalDeaths = 0;
        let totalAssists = 0;

        gMatches.forEach((m) => {
          const p = findParticipant(m, user.puuid)!;
          totalKills += p.kills;
          totalDeaths += p.deaths;
          totalAssists += p.assists;
        });

        const winRate = (wins / games) * 100;
        const avgKills = totalKills / games;
        const avgDeaths = totalDeaths / games;
        const avgAssists = totalAssists / games;
        const avgKda = (avgKills + avgAssists) / Math.max(1, avgDeaths);

        // Mathematical score formula weighting Winrate + KDA + games played
        const score = winRate * 1.5 + avgKda * 2.0 + games * 0.2;

        data[user.puuid][role].push({
          championName: group.p.championName,
          championId: group.p.championId,
          games,
          wins,
          kills: totalKills,
          deaths: totalDeaths,
          assists: totalAssists,
          winRate,
          avgKda,
          score,
        });
      });

      // Sort champions in each role by score descending
      ROLES.forEach((role) => {
        data[user.puuid][role].sort((a, b) => b.score - a.score);
      });
    });

    return data;
  }, [users, matches]);

  // Option A: Unique Dream Team (Optimal assignment of 5 unique players to 5 roles)
  const uniqueDreamTeam = useMemo(() => {
    if (users.length < 5) return null;

    let bestRoster: Record<Role, UserRolePerformance> | null = null;
    let bestTotalScore = -1;

    // 1) Find all combinations of 5 players
    const playerCombos = getCombinations(users, 5);

    // 2) For each combination, check all 120 permutations
    playerCombos.forEach((combo) => {
      const permutations = getPermutations(combo);

      permutations.forEach((perm) => {
        // perm is [pTop, pJungle, pMid, pAdc, pSupport]
        let currentScore = 0;
        let valid = true;

        const currentRoster: Partial<Record<Role, UserRolePerformance>> = {};

        for (let i = 0; i < 5; i++) {
          const role = ROLES[i];
          const user = perm[i];
          const bestChamp = userPerformanceData[user.puuid][role][0]; // highest scoring champ

          if (!bestChamp) {
            // Player has never played this role
            valid = false;
            break;
          }

          currentScore += bestChamp.score;
          currentRoster[role] = { user, role, bestChamp };
        }

        if (valid && currentScore > bestTotalScore) {
          bestTotalScore = currentScore;
          bestRoster = currentRoster as Record<Role, UserRolePerformance>;
        }
      });
    });

    return bestRoster;
  }, [users, userPerformanceData]);

  // Option B: Absolute Best per Role (Disregards duplicates)
  const absoluteDreamTeam = useMemo(() => {
    const roster: Record<Role, UserRolePerformance | null> = {
      top: null,
      jungle: null,
      mid: null,
      adc: null,
      support: null,
    };

    ROLES.forEach((role) => {
      let bestCandidate: UserRolePerformance | null = null;
      let highestScore = -1;

      users.forEach((user) => {
        const bestChamp = userPerformanceData[user.puuid][role][0];
        if (bestChamp && bestChamp.score > highestScore) {
          highestScore = bestChamp.score;
          bestCandidate = { user, role, bestChamp };
        }
      });

      roster[role] = bestCandidate;
    });

    return roster;
  }, [users, userPerformanceData]);

  // Select active team based on configuration and viewMode
  const activeTeam = useMemo(() => {
    if (viewMode === "unique" && uniqueDreamTeam) {
      return uniqueDreamTeam;
    }
    return absoluteDreamTeam;
  }, [viewMode, uniqueDreamTeam, absoluteDreamTeam]);

  if (users.length === 0) {
    return <div className="panel empty">{t("page.startByAddingUser")}</div>;
  }

  const hasData = Object.values(activeTeam).some(Boolean);

  return (
    <div>
      <h2>{t("dreamTeam.title")}</h2>
      <p className="subtitle" style={{ marginTop: -8 }}>
        {t("dreamTeam.subtitle")}
      </p>

      {/* Mode selectors */}
      {uniqueDreamTeam && (
        <div className="panel" style={{ padding: "8px 12px", marginBottom: 24, display: "inline-flex", gap: 8 }}>
          <button
            className={`tab ${viewMode === "unique" ? "active" : ""}`}
            onClick={() => setViewMode("unique")}
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            {t("dreamTeam.uniqueRosterTitle")}
          </button>
          <button
            className={`tab ${viewMode === "absolute" ? "active" : ""}`}
            onClick={() => setViewMode("absolute")}
            style={{ padding: "6px 12px", fontSize: 12 }}
          >
            {t("dreamTeam.bestPerRoleTitle")}
          </button>
        </div>
      )}

      {/* Description header */}
      <p className="muted" style={{ fontSize: 13, marginTop: -12, marginBottom: 20 }}>
        {viewMode === "unique" && uniqueDreamTeam
          ? t("dreamTeam.uniqueRosterDesc")
          : t("dreamTeam.bestPerRoleDesc")}
      </p>

      {!hasData ? (
        <div className="panel empty" style={{ padding: 40, textAlign: "center" }}>
          {t("dreamTeam.notEnoughPlayers")}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {ROLES.map((role) => {
            const slot = activeTeam[role];
            if (!slot || !slot.bestChamp) {
              return (
                <div
                  key={role}
                  className="card"
                  style={{
                    opacity: 0.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    minHeight: 280,
                  }}
                >
                  <strong style={{ textTransform: "capitalize", color: "var(--accent)" }}>
                    {t(`dreamTeam.role${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                  </strong>
                  <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                    {t("dreamTeam.noMatchesRole")}
                  </p>
                </div>
              );
            }

            const { user, bestChamp } = slot;
            const funnyTitle = t(`dreamTeam.title${role.charAt(0).toUpperCase() + role.slice(1)}`);

            return (
              <div
                key={role}
                className="card game-select-card"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px 16px",
                  background: "var(--panel-2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  position: "relative",
                  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                  minHeight: 280,
                }}
              >
                {/* Role title & humor subtitle */}
                <strong
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    letterSpacing: "1px",
                  }}
                >
                  {t(`dreamTeam.role${role.charAt(0).toUpperCase() + role.slice(1)}`)}
                </strong>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--accent)",
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                >
                  {funnyTitle}
                </span>

                {/* Champ badge image */}
                <div style={{ marginBottom: 12 }}>
                  <ChampBadge championId={bestChamp.championId} name={bestChamp.championName} />
                </div>

                {/* Player Nick */}
                <h3 style={{ margin: "4px 0 2px 0", fontSize: 16, color: "var(--text)" }}>
                  {user.gameName}
                </h3>
                <span className="muted" style={{ fontSize: 11, marginBottom: 16 }}>
                  {bestChamp.championName}
                </span>

                {/* Stats breakdown */}
                <div
                  style={{
                    width: "100%",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 12,
                    marginTop: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="muted">{t("dreamTeam.winrate")}</span>
                    <strong className="win">{Math.round(bestChamp.winRate)}%</strong>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="muted">{t("dreamTeam.kda")}</span>
                    <strong>{num(bestChamp.avgKda, 2)}</strong>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="muted">{t("dreamTeam.gamesCount")}</span>
                    <strong>{bestChamp.games}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
