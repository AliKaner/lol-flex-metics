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
import { GuessGame } from "@/components/GuessGame";

const TABS = [
  { id: "report", label: "Tanrı mı, besleme mi" },
  { id: "leaderboard", label: "Şampiyon sıralaması" },
  { id: "combos", label: "Carry mi, sirk mi" },
  { id: "connections", label: "Kim kimi taşıyor" },
  { id: "highlights", label: "Efsane & utanç" },
  { id: "team", label: "Takım kurucu" },
  { id: "guess", label: "Who is that AGAmon" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const users = useUsers();
  const [tab, setTab] = useState<TabId>("report");
  const [timeRange, setTimeRange] = useState<"1m" | "3m" | "all">("1m");
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
          alert("Geçersiz yedek dosyası formatı!");
        }
      } catch (err) {
        alert("Dosya okuma veya ayrıştırma hatası!");
      }
    };
    reader.readAsText(file);
  };

  const startTime = useMemo(() => {
    if (timeRange === "1m") {
      return Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    }
    if (timeRange === "3m") {
      return Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    }
    return undefined;
  }, [timeRange]);

  const { matches, isLoading, loaded, total, error } = useMatchData(
    users,
    matchCount,
    startTime
  );

  const hasUsers = users.length > 0;
  // Takım kurucu maç verisi gerektirmez.
  const needsData = tab !== "team";

  return (
    <div className="container">
      <h1 className="site-title">
        League <span>Map</span>
      </h1>
      <p className="subtitle">
        Flex 5v5&apos;te kim tanrı kim besleme, ifşa zamanı.
      </p>

      <UserManager />

      {!hasUsers ? (
        <div className="panel empty">
          Başlamak için yukarıdan en az bir oyuncu ekle.
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 16 }}>
                <label className="row" style={{ gap: 8 }}>
                  <span className="muted">Zaman Aralığı:</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as "1m" | "3m" | "all")}
                  >
                    <option value="1m">Son 1 Ay (Hızlı)</option>
                    <option value="3m">Son 3 Ay</option>
                    <option value="all">Tüm Zamanlar</option>
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
                  {isLoading ? "Güncelleniyor..." : "🔄 Yenile"}
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
                  title="Tüm veri ve kullanıcı önbelleğini JSON olarak indir"
                >
                  📥 Dışa Aktar
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
                  title="Yedek JSON dosyasını yükle"
                >
                  📤 İçe Aktar
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
                  ? `Maçlar yükleniyor… ${loaded}/${total}`
                  : `${matches.length} flex maçı yüklendi`}
              </span>
            </div>
            {isLoading && total > 0 && (
              <div className="progress">
                <div style={{ width: `${(loaded / total) * 100}%` }} />
              </div>
            )}
            {error && (
              <p className="loss" style={{ marginTop: 8 }}>
                {error} — dev API key&apos;in süresi dolmuş olabilir (.env.local).
              </p>
            )}
          </div>

          <div className="tabs">
            {TABS.map((t) => (
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
            <div className="empty">Maç verileri yükleniyor…</div>
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
              {tab === "guess" && <GuessGame users={users} matches={matches} />}
            </>
          )}
        </>
      )}

      <footer className="muted" style={{ marginTop: 40, fontSize: 12 }}>
        Veriler Riot Games API&apos;sinden gelir. League Map, Riot Games
        tarafından onaylanmamıştır.
      </footer>
    </div>
  );
}
