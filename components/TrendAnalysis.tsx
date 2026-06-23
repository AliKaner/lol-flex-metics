"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { useTranslation } from "@/lib/i18n";
import { findParticipant } from "@/lib/analysis";

interface DataPoint {
  index: number;
  label: string;
  wr: number;
  wins: number;
  losses: number;
  totalGames: number;
}

interface PlayerTrendData {
  user: TrackedUser;
  color: string;
  visible: boolean;
  points: DataPoint[];
}

const LINE_COLORS = [
  "#38bdf8", // Sky blue
  "#fb7185", // Rose
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#a78bfa", // Purple
  "#fb923c", // Orange
  "#2dd4bf", // Teal
  "#f472b6", // Pink
];

// Helper to get local date string YYYY-MM-DD
function getDayKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Helper to get ISO week key YYYY-Wxx
function getWeekKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${weekNum}`;
}

// Helper to get localized Monday-Sunday range label
function getWeekRangeLabel(timestampMs: number, lang: "tr" | "en"): string {
  const d = new Date(timestampMs);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${monday.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", options)} - ${sunday.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", options)}`;
}

export function TrendAnalysis({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();

  // State controls
  const [groupBy, setGroupBy] = useState<"match" | "daily" | "weekly">("match");
  const [calcType, setCalcType] = useState<"cumulative" | "periodic">("cumulative");
  const [visiblePlayers, setVisiblePlayers] = useState<Record<string, boolean>>({});
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    userName: string;
    label: string;
    wr: number;
    wins: number;
    losses: number;
    color: string;
  } | null>(null);

  // Initialize player visibility state
  const playerVisibility = useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const u of users) {
      next[u.puuid] = visiblePlayers[u.puuid] ?? true;
    }
    return next;
  }, [users, visiblePlayers]);

  const togglePlayer = (puuid: string) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [puuid]: !(prev[puuid] ?? true),
    }));
  };

  // Sort matches oldest first
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => a.info.gameCreation - b.info.gameCreation);
  }, [matches]);

  // Compute intervals (days or weeks) across all matches
  const timelineIntervals = useMemo(() => {
    if (groupBy === "match") return [];

    const keys = new Set<string>();
    const keyMap = new Map<string, { timestamp: number; label: string }>();

    for (const m of sortedMatches) {
      const ts = m.info.gameCreation;
      if (groupBy === "daily") {
        const key = getDayKey(ts);
        keys.add(key);
        if (!keyMap.has(key)) {
          const d = new Date(ts);
          const label = d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
            month: "short",
            day: "numeric",
          });
          keyMap.set(key, { timestamp: ts, label });
        }
      } else {
        const key = getWeekKey(ts);
        keys.add(key);
        if (!keyMap.has(key)) {
          const label = getWeekRangeLabel(ts, lang);
          keyMap.set(key, { timestamp: ts, label });
        }
      }
    }

    // Sort intervals chronologically
    return [...keys].sort().map((key) => ({
      key,
      ...keyMap.get(key)!,
    }));
  }, [sortedMatches, groupBy, lang]);

  // Main data processor for trend lines
  const trendData: PlayerTrendData[] = useMemo(() => {
    return users.map((user, idx) => {
      const color = LINE_COLORS[idx % LINE_COLORS.length];
      const visible = playerVisibility[user.puuid] ?? true;

      // Filter matches where this specific user participated
      const userMatches = sortedMatches.filter((m) => findParticipant(m, user.puuid) !== undefined);

      if (userMatches.length === 0) {
        return { user, color, visible, points: [] };
      }

      const points: DataPoint[] = [];

      if (groupBy === "match") {
        let wins = 0;
        for (let i = 0; i < userMatches.length; i++) {
          const m = userMatches[i];
          const p = findParticipant(m, user.puuid)!;
          if (p.win) wins++;
          const wr = (wins / (i + 1)) * 100;
          points.push({
            index: i,
            label: `${t("trends.interval")} ${i + 1}`,
            wr: Math.round(wr),
            wins,
            losses: i + 1 - wins,
            totalGames: i + 1,
          });
        }
      } else {
        // Daily or Weekly grouping
        let cumulativeWins = 0;
        let cumulativeGames = 0;

        timelineIntervals.forEach((interval, idx) => {
          // Filter matches within this specific day/week
          const matchesInInterval = userMatches.filter((m) => {
            const key = groupBy === "daily" ? getDayKey(m.info.gameCreation) : getWeekKey(m.info.gameCreation);
            return key === interval.key;
          });

          const intervalWins = matchesInInterval.filter((m) => findParticipant(m, user.puuid)!.win).length;
          const intervalGames = matchesInInterval.length;

          cumulativeWins += intervalWins;
          cumulativeGames += intervalGames;

          if (calcType === "cumulative") {
            // Plot cumulative stats up to the end of this interval
            if (cumulativeGames > 0) {
              const wr = (cumulativeWins / cumulativeGames) * 100;
              points.push({
                index: idx,
                label: interval.label,
                wr: Math.round(wr),
                wins: cumulativeWins,
                losses: cumulativeGames - cumulativeWins,
                totalGames: cumulativeGames,
              });
            }
          } else {
            // Plot periodic stats inside this interval
            if (intervalGames > 0) {
              const wr = (intervalWins / intervalGames) * 100;
              points.push({
                index: idx,
                label: interval.label,
                wr: Math.round(wr),
                wins: intervalWins,
                losses: intervalGames - intervalWins,
                totalGames: intervalGames,
              });
            } else {
              // Carry over last point if cumulative, or leave empty if periodic.
              // For periodic, we don't push a point so the line doesn't connect.
            }
          }
        });
      }

      return { user, color, visible, points };
    });
  }, [users, sortedMatches, groupBy, timelineIntervals, calcType, playerVisibility, t]);

  // Dimensions & scaling for custom SVG line chart
  const chartWidth = 800;
  const chartHeight = 400;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };

  const maxPointsCount = useMemo(() => {
    if (groupBy === "match") {
      return Math.max(...trendData.map((d) => d.points.length), 1);
    }
    return Math.max(timelineIntervals.length, 1);
  }, [trendData, groupBy, timelineIntervals]);

  // SVG rendering coordinates helpers
  const getCoordinates = (pointIndex: number, wrValue: number) => {
    const totalSlots = maxPointsCount > 1 ? maxPointsCount - 1 : 1;
    const x = padding.left + (pointIndex / totalSlots) * (chartWidth - padding.left - padding.right);
    const y = padding.top + (1 - wrValue / 100) * (chartHeight - padding.top - padding.bottom);
    return { x, y };
  };

  // Grid vertical guidelines
  const gridLines = useMemo(() => {
    const lines = [];
    const count = Math.min(maxPointsCount, groupBy === "match" ? 10 : 8);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / (count - 1 || 1)) * (maxPointsCount - 1));
      const totalSlots = maxPointsCount > 1 ? maxPointsCount - 1 : 1;
      const x = padding.left + (idx / totalSlots) * (chartWidth - padding.left - padding.right);

      let label = "";
      if (groupBy === "match") {
        label = `#${idx + 1}`;
      } else if (timelineIntervals[idx]) {
        label = timelineIntervals[idx].label;
      }
      lines.push({ x, label });
    }
    return lines;
  }, [maxPointsCount, groupBy, timelineIntervals]);

  // Form comparison metrics at the bottom
  const formTableData = useMemo(() => {
    return trendData.map((td) => {
      const points = td.points;
      if (points.length === 0) {
        return {
          user: td.user,
          color: td.color,
          visible: td.visible,
          currentWR: null,
          change: null,
          trend: "stable",
          recordText: "-",
        };
      }

      const latest = points[points.length - 1];
      const previous = points[points.length - 2];

      const currentWR = latest.wr;
      const change = previous ? latest.wr - previous.wr : 0;

      let trend = "stable";
      if (change > 0) trend = "up";
      if (change < 0) trend = "down";

      const recordText = `${latest.wins}W - ${latest.losses}L`;

      return {
        user: td.user,
        color: td.color,
        visible: td.visible,
        currentWR,
        change,
        trend,
        recordText,
      };
    });
  }, [trendData]);

  if (users.length === 0) {
    return <div className="panel empty">{t("page.startByAddingUser")}</div>;
  }

  // Draw smooth lines
  const drawLinePath = (points: DataPoint[]) => {
    if (points.length < 2) return "";
    return points
      .map((p, i) => {
        const { x, y } = getCoordinates(p.index, p.wr);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div style={{ position: "relative" }}>
      <h2>{t("trends.title")}</h2>
      <p className="subtitle" style={{ marginTop: -8 }}>
        {t("trends.subtitle")}
      </p>

      {/* Control Panel */}
      <div className="panel flex-wrap" style={{ gap: 20, marginBottom: 24 }}>
        {/* Interval Selector */}
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">{t("trends.groupBy")}</span>
          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as any);
              setHoveredPoint(null);
            }}
          >
            <option value="match">{t("trends.matchByMatch")}</option>
            <option value="daily">{t("trends.daily")}</option>
            <option value="weekly">{t("trends.weekly")}</option>
          </select>
        </label>

        {/* Calculation Type */}
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">{t("trends.calcType")}</span>
          <select
            value={calcType}
            onChange={(e) => {
              setCalcType(e.target.value as any);
              setHoveredPoint(null);
            }}
          >
            <option value="cumulative">{t("trends.cumulative")}</option>
            {groupBy !== "match" && <option value="periodic">{t("trends.periodic")}</option>}
          </select>
        </label>

        {/* Visibility Filter Toggles */}
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <span className="muted">{t("trends.playerFilters")}</span>
          {trendData.map((td) => (
            <label
              key={td.user.puuid}
              className="row"
              style={{
                gap: 6,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
                background: "var(--panel-2)",
                border: `1px solid ${td.visible ? td.color : "var(--border)"}`,
                opacity: td.visible ? 1 : 0.6,
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={td.visible}
                onChange={() => togglePlayer(td.user.puuid)}
                style={{ display: "none" }}
              />
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: td.color,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: td.visible ? 600 : 400 }}>
                {td.user.gameName}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart Box */}
      <div
        className="panel"
        style={{
          padding: 10,
          background: "var(--panel-1)",
          overflowX: "auto",
          position: "relative",
        }}
      >
        {matches.length === 0 ? (
          <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="muted">{t("trends.noData")}</p>
          </div>
        ) : (
          <div style={{ width: "100%", minWidth: 600, position: "relative" }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width="100%"
              height="100%"
              style={{ display: "block" }}
            >
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map((val) => {
                const y = padding.top + (1 - val / 100) * (chartHeight - padding.top - padding.bottom);
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth={1}
                      strokeDasharray={val === 50 ? "0" : "4 4"}
                      opacity={val === 50 ? 0.3 : 0.15}
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      fill="var(--text-muted)"
                      fontSize={11}
                      textAnchor="end"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Vertical grid lines */}
              {gridLines.map((line, idx) => (
                <g key={idx}>
                  <line
                    x1={line.x}
                    y1={padding.top}
                    x2={line.x}
                    y2={chartHeight - padding.bottom}
                    stroke="var(--border)"
                    strokeWidth={1}
                    opacity={0.15}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={line.x}
                    y={chartHeight - padding.bottom + 20}
                    fill="var(--text-muted)"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {line.label}
                  </text>
                </g>
              ))}

              {/* Line paths */}
              {trendData
                .filter((td) => td.visible)
                .map((td) => (
                  <path
                    key={td.user.puuid}
                    d={drawLinePath(td.points)}
                    fill="none"
                    stroke={td.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 0.3s" }}
                  />
                ))}

              {/* Circle points on line nodes */}
              {trendData
                .filter((td) => td.visible)
                .map((td) =>
                  td.points.map((p) => {
                    const { x, y } = getCoordinates(p.index, p.wr);
                    const isHovered = hoveredPoint && hoveredPoint.userName === td.user.gameName && hoveredPoint.label === p.label;

                    return (
                      <circle
                        key={`${td.user.puuid}-${p.index}`}
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 4}
                        fill="var(--panel-1)"
                        stroke={td.color}
                        strokeWidth={2}
                        style={{ cursor: "pointer", transition: "r 0.15s" }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                          if (svgRect) {
                            setHoveredPoint({
                              x: rect.left - svgRect.left + rect.width / 2,
                              y: rect.top - svgRect.top - 10,
                              userName: td.user.gameName,
                              label: p.label,
                              wr: p.wr,
                              wins: p.wins,
                              losses: p.losses,
                              color: td.color,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })
                )}
            </svg>

            {/* Interactive Tooltip Card Overlay */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  left: hoveredPoint.x,
                  top: hoveredPoint.y,
                  transform: "translate(-50%, -100%)",
                  pointerEvents: "none",
                  backgroundColor: "rgba(10, 25, 30, 0.95)",
                  border: `1px solid ${hoveredPoint.color}`,
                  boxShadow: `0 0 10px ${hoveredPoint.color}40`,
                  borderRadius: "6px",
                  padding: "8px 12px",
                  zIndex: 10,
                  backdropFilter: "blur(4px)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: hoveredPoint.color, marginBottom: 2 }}>
                  {hoveredPoint.userName}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                  {hoveredPoint.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, display: "flex", gap: 8 }}>
                  <span>{hoveredPoint.wr}% WR</span>
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    ({hoveredPoint.wins}W - {hoveredPoint.losses}L)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form & Metrics Leaderboard Table */}
      {matches.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>{t("trends.tableTitle")}</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{t("championLeaderboard.player")}</th>
                  <th>{t("trends.record")}</th>
                  <th>{t("trends.winrate")}</th>
                  <th>{t("trends.trend")}</th>
                </tr>
              </thead>
              <tbody>
                {formTableData
                  .filter((row) => row.visible)
                  .map((row) => {
                    const hasWR = row.currentWR !== null;
                    return (
                      <tr key={row.user.puuid} style={{ verticalAlign: "middle" }}>
                        <td>
                          <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: row.color,
                              }}
                            />
                            <strong>{row.user.gameName}</strong>
                          </div>
                        </td>
                        <td>{row.recordText}</td>
                        <td style={{ fontWeight: 700 }}>
                          {hasWR ? `${row.currentWR}%` : t("trends.noGames")}
                        </td>
                        <td>
                          {row.trend === "up" && (
                            <span className="badge win" style={{ fontSize: 11 }}>
                              {t("trends.upTrend")}{" "}
                              {row.change !== null && row.change !== 0 && `(+${row.change}%)`}
                            </span>
                          )}
                          {row.trend === "down" && (
                            <span className="badge loss" style={{ fontSize: 11 }}>
                              {t("trends.downTrend")}{" "}
                              {row.change !== null && row.change !== 0 && `(${row.change}%)`}
                            </span>
                          )}
                          {row.trend === "stable" && hasWR && (
                            <span className="badge" style={{ background: "var(--panel-2)", fontSize: 11 }}>
                              {t("trends.stable")}
                            </span>
                          )}
                          {!hasWR && <span className="muted">-</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
