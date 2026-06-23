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
import { useTranslation } from "@/lib/i18n";

type TabId = "report" | "leaderboard" | "combos" | "connections" | "highlights" | "team" | "games" | "trends";

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
    // Season 2026 Start: Jan 8, 2026
    return Math.floor(new Date("2026-01-08T00:00:00Z").getTime() / 1000);
  }, [timeRange]);

  const { matches, isLoading, loaded, total, error } = useMatchData(
    users,
    matchCount,
    startTime
  );

  const hasUsers = users.length > 0;
  // Takım kurucu maç verisi gerektirmez.
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
  ] as const;

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="site-title" style={{ margin: 0 }}>
          {t("page.siteTitle")} <span>{t("page.siteTitleSpan")}</span>
        </h1>
        <button
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            background: "var(--panel-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {lang === "tr" ? "🇺🇸 EN" : "🇹🇷 TR"}
        </button>
      </div>
      <p className="subtitle" style={{ marginTop: -10 }}>
        {t("page.subtitle")}
      </p>

      <UserManager />

      {!hasUsers ? (
        <div className="panel empty">
          {t("page.startByAddingUser")}
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 16 }}>
                <label className="row" style={{ gap: 8 }}>
                  <span className="muted">{t("page.timeRange")}</span>
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
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    background: "var(--accent-2)",
                    color: "#021014",
                    borderRadius: "6px"
                  }}
                >
                  {isLoading ? t("page.refreshing") : t("page.refresh")}
                </button>
                <button
                  onClick={handleExport}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    background: "var(--panel-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px"
                  }}
                  title={t("page.exportTitle")}
                >
                  {t("page.export")}
                </button>
                <label
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    background: "var(--panel-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center"
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
              <span className="muted">
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
              <p className="loss" style={{ marginTop: 8 }}>
                {error} — {t("page.apiExpired")}
              </p>
            )}
          </div>

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
            </>
          )}
        </>
      )}

      <footer className="muted" style={{ marginTop: 40, fontSize: 12 }}>
        {t("page.footer")}
      </footer>
    </div>
  );
}
