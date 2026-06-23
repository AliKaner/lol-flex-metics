"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { userParticipations, kda, csPerMin, killParticipation } from "@/lib/analysis";
import { championIcon } from "@/lib/assets";
import { duration, kdaStr, num } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

interface PlayerItem {
  id: string; // puuid or summonerName
  name: string;
}

interface ScoreCard {
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalDamage: number;
  kp: number;
  cs: number;
}

interface Pair {
  playerId: string;
  championId: number;
}

const COLORS = ["#00f0ff", "#a855f7", "#eab308", "#f97316"];

export function MatchMatcher({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [cards, setCards] = useState<ScoreCard[]>([]);
  const [pairings, setPairings] = useState<Pair[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [roastMsg, setRoastMsg] = useState("");
  const [correctCount, setCorrectCount] = useState(0);

  const initGame = useCallback(() => {
    // 1) Find matches where at least 1 tracked player exists
    const validMatches = matches.filter((m) =>
      m.info.participants.some((p) => users.some((u) => u.puuid === p.puuid))
    );
    if (validMatches.length === 0) {
      setMatch(null);
      return;
    }

    const randomMatch = validMatches[Math.floor(Math.random() * validMatches.length)];
    setMatch(randomMatch);

    // 2) Gather team of 5 participants containing our tracked players
    // Identify which team has our tracked player
    const trackedPart = randomMatch.info.participants.find((p) =>
      users.some((u) => u.puuid === p.puuid)
    );
    if (!trackedPart) return;

    const sameTeamParts = randomMatch.info.participants.filter(
      (p) => p.teamId === trackedPart.teamId
    );

    // Slice to 4 players (we always pair 4 to keep it clean)
    const matchParts = sameTeamParts.slice(0, 4);

    // 3) Create PlayerItems (shuffled)
    const playerItems = matchParts.map((p) => {
      const u = users.find((usr) => usr.puuid === p.puuid);
      return {
        id: p.puuid || p.summonerName || p.riotIdGameName || "",
        name: u ? `${u.gameName}#${u.tagLine}` : (p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline || ""}` : (p.summonerName || "")),
      };
    });
    setPlayers(shuffle(playerItems));

    // 4) Create ScoreCards (shuffled)
    const scoreCards = matchParts.map((p) => ({
      championId: p.championId,
      championName: p.championName,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      totalDamage: p.totalDamageDealtToChampions,
      kp: Math.round(killParticipation(randomMatch, p) * 100),
      cs: Number(csPerMin(randomMatch, p).toFixed(1)),
    }));
    setCards(shuffle(scoreCards));

    // 5) Reset State
    setPairings([]);
    setSelectedPlayer(null);
    setSelectedCard(null);
    setSubmitted(false);
    setRoastMsg("");
    setCorrectCount(0);
  }, [users, matches]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handlePlayerClick = (playerId: string) => {
    if (submitted) return;
    // If clicking an already paired player, unpair them
    const existing = pairings.find((p) => p.playerId === playerId);
    if (existing) {
      setPairings(pairings.filter((p) => p.playerId !== playerId));
      return;
    }

    if (selectedPlayer === playerId) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(playerId);
      if (selectedCard !== null) {
        // Form a new pairing
        setPairings([...pairings, { playerId, championId: selectedCard }]);
        setSelectedPlayer(null);
        setSelectedCard(null);
      }
    }
  };

  const handleCardClick = (championId: number) => {
    if (submitted) return;
    // If clicking an already paired card, unpair them
    const existing = pairings.find((p) => p.championId === championId);
    if (existing) {
      setPairings(pairings.filter((p) => p.championId !== championId));
      return;
    }

    if (selectedCard === championId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(championId);
      if (selectedPlayer !== null) {
        // Form a new pairing
        setPairings([...pairings, { playerId: selectedPlayer, championId }]);
        setSelectedPlayer(null);
        setSelectedCard(null);
      }
    }
  };

  const checkResults = () => {
    if (pairings.length < 4) {
      alert(t("matchMatcher.unmatched"));
      return;
    }

    let correct = 0;
    pairings.forEach((pair) => {
      // Find the participant in the match data
      const part = match?.info.participants.find(
        (p) => (p.puuid || p.summonerName || p.riotIdGameName || "") === pair.playerId
      );
      if (part && part.championId === pair.championId) {
        correct++;
      }
    });

    setCorrectCount(correct);
    setSubmitted(true);

    // Apply roast
    if (correct === 4) setRoastMsg(t("matchMatcher.roast4"));
    else if (correct === 3) setRoastMsg(t("matchMatcher.roast3"));
    else if (correct === 2) setRoastMsg(t("matchMatcher.roast2"));
    else if (correct === 1) setRoastMsg(t("matchMatcher.roast1"));
    else setRoastMsg(t("matchMatcher.roast0"));
  };

  if (!match) {
    return <div className="empty">{t("guessGame.notEnoughUsersGuess")}</div>;
  }

  return (
    <div>
      <h2>{t("matchMatcher.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("matchMatcher.subtitle")} · {duration(match.info.gameDuration)} ·{" "}
        <span className={match.info.participants.find(p => users.some(u => u.puuid === p.puuid))?.win ? "win" : "loss"} style={{ fontWeight: 700 }}>
          {match.info.participants.find(p => users.some(u => u.puuid === p.puuid))?.win ? t("highlights.victoryLabel") : t("highlights.defeatLabel")}
        </span>
      </p>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: 20 }}>
        {/* Left: Players */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {players.map((p) => {
            const pairIdx = pairings.findIndex((pair) => pair.playerId === p.id);
            const isSelected = selectedPlayer === p.id;
            const isPaired = pairIdx !== -1;
            const color = isPaired ? COLORS[pairIdx % COLORS.length] : "transparent";

            // Check correct/wrong if submitted
            let outlineColor = isSelected ? "var(--accent-2)" : (isPaired ? color : "var(--border)");
            let statusSuffix = "";

            if (submitted && isPaired) {
              const actualPart = match.info.participants.find(
                (part) => (part.puuid || part.summonerName || part.riotIdGameName || "") === p.id
              );
              const guessedChamp = pairings[pairIdx].championId;
              const isCorrect = actualPart && actualPart.championId === guessedChamp;
              outlineColor = isCorrect ? "var(--win)" : "var(--loss)";
              statusSuffix = isCorrect ? ` (${t("matchMatcher.correct")})` : ` (${t("matchMatcher.incorrect")})`;
            }

            return (
              <div
                key={p.id}
                onClick={() => handlePlayerClick(p.id)}
                className="card"
                style={{
                  cursor: submitted ? "default" : "pointer",
                  border: `2px solid ${outlineColor}`,
                  boxShadow: isSelected ? "0 0 15px rgba(0, 240, 255, 0.2)" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "var(--transition)",
                  padding: "16px 20px",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</span>
                {isPaired && (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: outlineColor,
                      boxShadow: `0 0 8px ${outlineColor}`,
                    }}
                  />
                )}
                {submitted && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: outlineColor,
                      marginLeft: 8,
                    }}
                  >
                    {statusSuffix}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Scores */}
        <div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {cards.map((c) => {
            const pairIdx = pairings.findIndex((pair) => pair.championId === c.championId);
            const isSelected = selectedCard === c.championId;
            const isPaired = pairIdx !== -1;
            const color = isPaired ? COLORS[pairIdx % COLORS.length] : "transparent";

            let outlineColor = isSelected ? "var(--accent-2)" : (isPaired ? color : "var(--border)");

            if (submitted && isPaired) {
              const matchedPlayer = pairings[pairIdx].playerId;
              const actualPart = match.info.participants.find(
                (part) => (part.puuid || part.summonerName || part.riotIdGameName || "") === matchedPlayer
              );
              const isCorrect = actualPart && actualPart.championId === c.championId;
              outlineColor = isCorrect ? "var(--win)" : "var(--loss)";
            }

            return (
              <div
                key={c.championId}
                onClick={() => handleCardClick(c.championId)}
                className="card"
                style={{
                  cursor: submitted ? "default" : "pointer",
                  border: `2px solid ${outlineColor}`,
                  boxShadow: isSelected ? "0 0 15px rgba(0, 240, 255, 0.2)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transition: "var(--transition)",
                  padding: "16px 20px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={championIcon(c.championId)}
                  alt={c.championName}
                  style={{ width: 44, height: 44, borderRadius: 8, border: `1.5px solid ${outlineColor}` }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{c.championName}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    KDA: <strong style={{ color: "#fff" }}>{c.kills}/{c.deaths}/{c.assists}</strong> ·{" "}
                    Dmg: <strong style={{ color: "#fff" }}>{c.totalDamage.toLocaleString(lang)}</strong> ·{" "}
                    KP: <strong style={{ color: "#fff" }}>{c.kp}%</strong> ·{" "}
                    CS/m: <strong style={{ color: "#fff" }}>{c.cs}</strong>
                  </div>
                </div>

                {isPaired && (
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: outlineColor,
                      boxShadow: `0 0 8px ${outlineColor}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        {submitted ? (
          <div>
            <h4 className={correctCount === 4 ? "win" : "gold"} style={{ fontSize: 18, marginBottom: 8 }}>
              {t("matchMatcher.scoreResult", { correct: correctCount })}
            </h4>
            <p className="muted" style={{ fontSize: 14, fontStyle: "italic", marginBottom: 16 }}>
              “{roastMsg}”
            </p>
            <button onClick={initGame} style={{ width: 200 }}>
              {t("matchMatcher.nextMatch")}
            </button>
          </div>
        ) : (
          <button
            onClick={checkResults}
            disabled={pairings.length < 4}
            style={{ width: 220 }}
          >
            {t("matchMatcher.checkAnswers")}
          </button>
        )}
      </div>
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
