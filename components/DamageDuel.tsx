"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { championIcon } from "@/lib/assets";
import { duration } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

interface DuelParticipant {
  id: string; // puuid or name
  name: string;
  championId: number;
  championName: string;
  damage: number;
}

export function DamageDuel({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();
  const [match, setMatch] = useState<Match | null>(null);
  const [playerA, setPlayerA] = useState<DuelParticipant | null>(null);
  const [playerB, setPlayerB] = useState<DuelParticipant | null>(null);
  const [guess, setGuess] = useState<string | null>(null); // "A" or "B"
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);

  const initDuel = useCallback(() => {
    // 1) Find matches containing at least 1 tracked player
    const validMatches = matches.filter((m) =>
      m.info.participants.some((p) => users.some((u) => u.puuid === p.puuid))
    );
    if (validMatches.length === 0) {
      setMatch(null);
      return;
    }

    const randomMatch = validMatches[Math.floor(Math.random() * validMatches.length)];
    setMatch(randomMatch);

    // 2) Find tracked players in this match
    const trackedParts = randomMatch.info.participants.filter((p) =>
      users.some((u) => u.puuid === p.puuid)
    );

    let partA: MatchParticipant;
    let partB: MatchParticipant;

    if (trackedParts.length >= 2) {
      // Compare two tracked players
      const shuffled = shuffle(trackedParts);
      partA = shuffled[0];
      partB = shuffled[1];
    } else {
      // Compare one tracked player vs a teammate
      partA = trackedParts[0];
      const teamTeammates = randomMatch.info.participants.filter(
        (p) => p.teamId === partA.teamId && p.puuid !== partA.puuid
      );
      if (teamTeammates.length > 0) {
        partB = teamTeammates[Math.floor(Math.random() * teamTeammates.length)];
      } else {
        // Fallback to any other player in the lobby
        const others = randomMatch.info.participants.filter((p) => p.puuid !== partA.puuid);
        partB = others[Math.floor(Math.random() * others.length)];
      }
    }

    const userA = users.find((u) => u.puuid === partA.puuid);
    const userB = users.find((u) => u.puuid === partB.puuid);

    setPlayerA({
      id: "A",
      name: userA ? `${userA.gameName}#${userA.tagLine}` : (partA.riotIdGameName ? `${partA.riotIdGameName}#${partA.riotIdTagline || ""}` : (partA.summonerName || "")),
      championId: partA.championId,
      championName: partA.championName,
      damage: partA.totalDamageDealtToChampions,
    });

    setPlayerB({
      id: "B",
      name: userB ? `${userB.gameName}#${userB.tagLine}` : (partB.riotIdGameName ? `${partB.riotIdGameName}#${partB.riotIdTagline || ""}` : (partB.summonerName || "")),
      championId: partB.championId,
      championName: partB.championName,
      damage: partB.totalDamageDealtToChampions,
    });

    setGuess(null);
    setRevealed(false);
  }, [users, matches]);

  useEffect(() => {
    initDuel();
  }, [initDuel]);

  if (!match || !playerA || !playerB) {
    return <div className="empty">{t("damageDuel.noDuelData")}</div>;
  }

  const handleGuess = (side: "A" | "B") => {
    if (revealed) return;
    setGuess(side);
    setRevealed(true);

    const dmgA = playerA.damage;
    const dmgB = playerB.damage;
    const isCorrect = (side === "A" && dmgA >= dmgB) || (side === "B" && dmgB >= dmgA);

    if (isCorrect) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const maxDmg = Math.max(playerA.damage, playerB.damage, 1);
  const percentA = revealed ? (playerA.damage / maxDmg) * 100 : 0;
  const percentB = revealed ? (playerB.damage / maxDmg) * 100 : 0;

  const dmgA = playerA.damage;
  const dmgB = playerB.damage;
  const winnerSide = dmgA >= dmgB ? "A" : "B";
  const userGuessedCorrectly = guess === winnerSide;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>{t("damageDuel.title")}</h2>
        {streak > 0 && (
          <span style={{ fontSize: 13, color: "#fcd34d", fontWeight: 700, textShadow: "0 0 10px rgba(251, 191, 36, 0.4)" }}>
            Streak: 🔥 {streak}
          </span>
        )}
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("damageDuel.subtitle")} · {duration(match.info.gameDuration)}
      </p>

      <div style={{ display: "flex", gap: "24px", justifyContent: "center", alignItems: "center", margin: "30px 0", flexWrap: "wrap" }}>
        {/* Card Player A */}
        <div
          onClick={() => handleGuess("A")}
          className={`card duel-player-card ${guess === "A" ? "selected" : ""}`}
          style={{
            flex: "1 1 200px",
            maxWidth: "280px",
            textAlign: "center",
            cursor: revealed ? "default" : "pointer",
            border: `2px solid ${revealed && winnerSide === "A" ? "var(--win)" : (guess === "A" ? "var(--accent-2)" : "var(--border)")}`,
            boxShadow: revealed && winnerSide === "A" ? "0 0 15px rgba(16, 185, 129, 0.25)" : "none",
            transition: "var(--transition)",
            padding: "24px 16px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={championIcon(playerA.championId)}
            alt={playerA.championName}
            style={{ width: 72, height: 72, borderRadius: 12, border: "2px solid var(--border)", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 800, fontSize: 16 }}>{playerA.name}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{playerA.championName}</div>
        </div>

        {/* VS circle */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--panel-2-solid)",
            border: "2px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            color: "var(--accent)",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          }}
        >
          {t("damageDuel.vs")}
        </div>

        {/* Card Player B */}
        <div
          onClick={() => handleGuess("B")}
          className={`card duel-player-card ${guess === "B" ? "selected" : ""}`}
          style={{
            flex: "1 1 200px",
            maxWidth: "280px",
            textAlign: "center",
            cursor: revealed ? "default" : "pointer",
            border: `2px solid ${revealed && winnerSide === "B" ? "var(--win)" : (guess === "B" ? "var(--accent-2)" : "var(--border)")}`,
            boxShadow: revealed && winnerSide === "B" ? "0 0 15px rgba(16, 185, 129, 0.25)" : "none",
            transition: "var(--transition)",
            padding: "24px 16px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={championIcon(playerB.championId)}
            alt={playerB.championName}
            style={{ width: 72, height: 72, borderRadius: 12, border: "2px solid var(--border)", marginBottom: 12 }}
          />
          <div style={{ fontWeight: 800, fontSize: 16 }}>{playerB.name}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{playerB.championName}</div>
        </div>
      </div>

      {revealed && (
        <div className="card" style={{ maxWidth: 600, margin: "20px auto 0", border: "1.5px solid var(--border)", padding: 24 }}>
          {/* Damage Showdown Bars */}
          <div style={{ marginBottom: 16 }}>
            <div className="stat-line" style={{ marginBottom: 6, fontWeight: 700 }}>
              <span>{playerA.name} ({playerA.championName})</span>
              <span className={winnerSide === "A" ? "win" : "muted"}>{playerA.damage.toLocaleString(lang)}</span>
            </div>
            <div className="progress" style={{ height: 16, background: "#0b0f17" }}>
              <div
                style={{
                  width: `${percentA}%`,
                  height: "100%",
                  background: winnerSide === "A" ? "linear-gradient(90deg, var(--accent-2), #00a8ff)" : "linear-gradient(90deg, #4b5563, #6b7280)",
                  transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: winnerSide === "A" ? "0 0 12px var(--accent-2)" : "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="stat-line" style={{ marginBottom: 6, fontWeight: 700 }}>
              <span>{playerB.name} ({playerB.championName})</span>
              <span className={winnerSide === "B" ? "win" : "muted"}>{playerB.damage.toLocaleString(lang)}</span>
            </div>
            <div className="progress" style={{ height: 16, background: "#0b0f17" }}>
              <div
                style={{
                  width: `${percentB}%`,
                  height: "100%",
                  background: winnerSide === "B" ? "linear-gradient(90deg, var(--accent-2), #00a8ff)" : "linear-gradient(90deg, #4b5563, #6b7280)",
                  transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: winnerSide === "B" ? "0 0 12px var(--accent-2)" : "none",
                }}
              />
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <h4 className={userGuessedCorrectly ? "win" : "loss"} style={{ fontSize: 18, marginBottom: 16 }}>
              {userGuessedCorrectly ? t("damageDuel.correctGuess") : t("damageDuel.wrongGuess")}
            </h4>
            <button onClick={initDuel} style={{ width: 180 }}>
              {t("damageDuel.nextDuel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
