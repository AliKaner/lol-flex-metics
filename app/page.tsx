"use client";

import { useState } from "react";
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
  const [matchCount, setMatchCount] = useState(40);

  const { matches, isLoading, loaded, total, error } = useMatchData(
    users,
    matchCount
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
              <label className="row" style={{ gap: 8 }}>
                <span className="muted">Oyuncu başına maç:</span>
                <select
                  value={matchCount}
                  onChange={(e) => setMatchCount(Number(e.target.value))}
                >
                  {[10, 20, 40, 60, 80, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
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
