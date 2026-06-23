"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/lib/usersStore";
import { useMatchData } from "@/hooks/useMatchData";
import { UserManager } from "@/components/UserManager";
import { ChampionReport } from "@/components/ChampionReport";
import { ChampionLeaderboard } from "@/components/ChampionLeaderboard";
import { ComboAnalysis } from "@/components/ComboAnalysis";
import { Connections } from "@/components/Connections";
import { Highlights } from "@/components/Highlights";
import { TeamBuilder } from "@/components/TeamBuilder";
import { GamesHub } from "@/components/GamesHub";
import { TrendAnalysis } from "@/components/TrendAnalysis";
import { QuickStats } from "@/components/QuickStats";
import { FunFacts } from "@/components/FunFacts";
import { PlayerOfTheDay } from "@/components/PlayerOfTheDay";
import { ShameWall } from "@/components/ShameWall";
import { DreamTeam } from "@/components/DreamTeam";
import { useTranslation } from "@/lib/i18n";

type TabId = "report" | "leaderboard" | "combos" | "connections" | "highlights" | "team" | "games" | "trends" | "dreamteam";

export default function Home() {
  const { t, lang, setLang } = useTranslation();
  const users = useUsers();
  const [tab, setTab] = useState<TabId>("report");
  const [timeRange, setTimeRange] = useState<"today" | "all">("all");
  const matchCount = 100;

  const queryClient = useQueryClient();
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["matchIds"] });
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;
    const usersData = window.localStorage.getItem("league-map-users") || "[]";
    const cacheData = window.localStorage.getItem("league-map-cache") || "{}";
    const backup = {
      version: "1.0",
      users: JSON.parse(usersData),
      cache: JSON.parse(cacheData)
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `league-map-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window === "undefined") return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (backup && backup.users && backup.cache) {
          const now = Date.now();
          if (backup.cache.timestamp) {
            backup.cache.timestamp = now;
          }
          if (backup.cache.clientState?.queries) {
            backup.cache.clientState.queries.forEach((q: any) => {
              if (q.state) {
                q.state.dataUpdatedAt = now;
                q.state.errorUpdatedAt = 0;
              }
            });
          }
          window.localStorage.setItem("league-map-users", JSON.stringify(backup.users));
          window.localStorage.setItem("league-map-cache", JSON.stringify(backup.cache));
          window.location.reload();
        } else {
          alert(t("page.invalidBackup"));
        }
      } catch (err) {
        alert(t("page.errorReadingFile"));
      }
    };
    reader.readAsText(file);
  };

  const startTime = useMemo(() => {
    if (timeRange === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return Math.floor(today.getTime() / 1000);
    }
    return Math.floor(new Date("2026-01-08T00:00:00Z").getTime() / 1000);
  }, [timeRange]);

  const { matches, isLoading, loaded, total, error } = useMatchData(
    users,
    matchCount,
    startTime
  );

  const hasUsers = users.length > 0;
  const needsData = tab !== "team";

  const tabs = [
    { id: "report", label: t("page.tabs.report") },
    { id: "leaderboard", label: t("page.tabs.leaderboard") },
    { id: "combos", label: t("page.tabs.combos") },
    { id: "connections", label: t("page.tabs.connections") },
    { id: "highlights", label: t("page.tabs.highlights") },
    { id: "team", label: t("page.tabs.team") },
    { id: "games", label: t("page.tabs.games") },
    { id: "trends", label: t("page.tabs.trends") },
    { id: "dreamteam", label: t("page.tabs.dreamteam") },
  ] as const;

  return (
    <div className="container">
      {/* Header */}
      <div className="site-header">
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="lol-flex-metics logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "6px",
              border: "2px solid var(--accent)",
              boxShadow: "0 0 15px rgba(200, 155, 60, 0.4)",
            }}
          />
          <h1 className="site-title" style={{ margin: 0 }}>
            {t("page.siteTitle")} <span>{t("page.siteTitleSpan")}</span>
          </h1>
        </div>
        <button
          className="lang-toggle"
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        >
          {lang === "tr" ? "EN" : "TR"}
        </button>
      </div>

      <p className="subtitle">
        {t("page.subtitle")}
      </p>

      <UserManager />

      {!hasUsers ? (
        <div className="panel empty">
          {t("page.startByAddingUser")}
        </div>
      ) : (
        <>
          {/* Controls Panel */}
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 12 }}>
                <label className="row" style={{ gap: 8 }}>
                  <span className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("page.timeRange")}</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as "today" | "all")}
                  >
                    <option value="all">{t("page.allTime")}</option>
                    <option value="today">{t("page.today")}</option>
                  </select>
                </label>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  style={{ fontSize: 11 }}
                >
                  {isLoading ? t("page.refreshing") : t("page.refresh")}
                </button>
                <button
                  className="ghost"
                  onClick={handleExport}
                  title={t("page.exportTitle")}
                  style={{ fontSize: 11 }}
                >
                  {t("page.export")}
                </button>
                <label
                  style={{
                    padding: "10px 16px",
                    fontSize: "11px",
                    background: "transparent",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    fontWeight: 600,
                    transition: "var(--transition)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                  title={t("page.importTitle")}
                >
                  {t("page.import")}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {isLoading
                  ? t("page.loadingMatches", { loaded, total })
                  : t("page.matchesLoaded", { count: matches.length })}
              </span>
            </div>
            {isLoading && total > 0 && (
              <div className="progress">
                <div style={{ width: `${(loaded / total) * 100}%` }} />
              </div>
            )}
            {error && (
              <p className="loss" style={{ marginTop: 8, fontSize: 12 }}>
                {error} — {t("page.apiExpired")}
              </p>
            )}
          </div>

          {/* Quick Stats Banner */}
          {matches.length > 0 && (
            <QuickStats users={users} matches={matches} />
          )}

          {/* Player of the Day + Fun Facts + Shame Wall */}
          {matches.length > 0 && (
            <>
              <PlayerOfTheDay users={users} matches={matches} />
              <FunFacts users={users} matches={matches} />
              <ShameWall users={users} matches={matches} />
            </>
          )}

          {/* Tabs */}
          <div className="tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {needsData && isLoading && matches.length === 0 ? (
            <div className="empty">{t("page.loadingMatchesLabel")}</div>
          ) : (
            <>
              {tab === "report" && <ChampionReport users={users} matches={matches} />}
              {tab === "leaderboard" && (
                <ChampionLeaderboard users={users} matches={matches} />
              )}
              {tab === "combos" && <ComboAnalysis users={users} matches={matches} />}
              {tab === "connections" && (
                <Connections users={users} matches={matches} />
              )}
              {tab === "highlights" && <Highlights users={users} matches={matches} />}
              {tab === "team" && <TeamBuilder users={users} />}
              {tab === "games" && <GamesHub users={users} matches={matches} />}
              {tab === "trends" && <TrendAnalysis users={users} matches={matches} />}
              {tab === "dreamteam" && <DreamTeam users={users} matches={matches} />}
            </>
          )}
        </>
      )}

      <footer className="muted" style={{ marginTop: 40, fontSize: 11, letterSpacing: "0.02em" }}>
        {t("page.footer")}
      </footer>
    </div>
  );
}
