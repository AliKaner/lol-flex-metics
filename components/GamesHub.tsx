"use client";

import { useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { useTranslation } from "@/lib/i18n";
import { GuessGame } from "@/components/GuessGame";
import { MatchMatcher } from "@/components/MatchMatcher";
import { DamageDuel } from "@/components/DamageDuel";
import { TournamentGame } from "@/components/TournamentGame";

type GameMode = "lobby" | "guess_player" | "guess_champ" | "matcher" | "duel" | "tournament";

export function GamesHub({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<GameMode>("lobby");

  if (mode === "lobby") {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2>{t("gamesHub.title")}</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            {t("gamesHub.subtitle")}
          </p>
        </div>

        <div className="grid cols-2" style={{ gap: 20 }}>
          {/* Card 1: Guess Player */}
          <div className="card game-select-card" onClick={() => setMode("guess_player")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🕵️</div>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>{t("gamesHub.guessPlayerTitle")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {t("gamesHub.guessPlayerDesc")}
            </p>
          </div>

          {/* Card 2: Guess Champion */}
          <div className="card game-select-card" onClick={() => setMode("guess_champ")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧙</div>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>{t("gamesHub.guessChampTitle")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {t("gamesHub.guessChampDesc")}
            </p>
          </div>

          {/* Card 3: Score Matcher */}
          <div className="card game-select-card" onClick={() => setMode("matcher")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>{t("gamesHub.matcherTitle")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {t("gamesHub.matcherDesc")}
            </p>
          </div>

          {/* Card 4: Damage Duel */}
          <div className="card game-select-card" onClick={() => setMode("duel")} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>{t("gamesHub.duelTitle")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {t("gamesHub.duelDesc")}
            </p>
          </div>

          {/* Card 5: Tournament Mode */}
          <div
            className="card game-select-card"
            onClick={() => setMode("tournament")}
            style={{ cursor: "pointer", gridColumn: "1 / -1" }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
            <h3 style={{ margin: 0, color: "var(--accent)" }}>{t("gamesHub.tournamentTitle")}</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              {t("gamesHub.tournamentDesc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <button
          className="ghost"
          onClick={() => setMode("lobby")}
          style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px" }}
        >
          {t("gamesHub.backToLobby")}
        </button>
      </div>

      <div className="panel" style={{ padding: "24px 20px" }}>
        {mode === "guess_player" && (
          <GuessGame users={users} matches={matches} mode="player" />
        )}
        {mode === "guess_champ" && (
          <GuessGame users={users} matches={matches} mode="champion" />
        )}
        {mode === "matcher" && (
          <MatchMatcher users={users} matches={matches} />
        )}
        {mode === "duel" && (
          <DamageDuel users={users} matches={matches} />
        )}
        {mode === "tournament" && (
          <TournamentGame users={users} matches={matches} />
        )}
      </div>
    </div>
  );
}
