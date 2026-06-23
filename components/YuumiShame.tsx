"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { championIcon } from "@/lib/assets";
import { findParticipant } from "@/lib/analysis";
import { duration } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

interface YuumiRound {
  match: Match;
  yuumi: MatchParticipant;
  candidates: {
    user: TrackedUser;
    p: MatchParticipant;
    isLessThanYuumi: boolean;
  }[];
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function YuumiShame({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();

  const [round, setRound] = useState<YuumiRound | null>(null);
  const [guesses, setGuesses] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [noYuumiData, setNoYuumiData] = useState(false);

  const yuumiMatches = useMemo(() => {
    const result: YuumiRound[] = [];

    for (const match of matches) {
      const yuumis = match.info.participants.filter(
        (p) => p.championName === "Yuumi"
      );
      if (yuumis.length === 0) continue;

      const yuumi = yuumis[0];
      const yuumiDmg = yuumi.totalDamageDealtToChampions;

      const candidates: YuumiRound["candidates"] = [];
      for (const user of users) {
        const p = findParticipant(match, user.puuid);
        if (!p) continue;
        if (p.championName === "Yuumi") continue;
        candidates.push({
          user,
          p,
          isLessThanYuumi: p.totalDamageDealtToChampions < yuumiDmg,
        });
      }

      if (candidates.length >= 2) {
        result.push({ match, yuumi, candidates });
      }
    }

    return result;
  }, [users, matches]);

  const newRound = useCallback(() => {
    if (yuumiMatches.length === 0) {
      setNoYuumiData(true);
      setRound(null);
      return;
    }

    const randomRound = yuumiMatches[Math.floor(Math.random() * yuumiMatches.length)];
    setRound({
      ...randomRound,
      candidates: shuffle(randomRound.candidates),
    });
    setGuesses(new Set());
    setRevealed(false);
  }, [yuumiMatches]);

  useEffect(() => {
    newRound();
  }, [newRound]);

  if (noYuumiData) {
    return (
      <div className="empty">
        {t("yuumiShame.noYuumiData")}
      </div>
    );
  }

  if (!round) return null;

  const { match, yuumi, candidates } = round;
  const yuumiDmg = yuumi.totalDamageDealtToChampions;
  const shamefulPlayers = candidates.filter((c) => c.isLessThanYuumi);

  const handleGuess = (puuid: string) => {
    if (revealed) return;
    const next = new Set(guesses);
    if (next.has(puuid)) {
      next.delete(puuid);
    } else {
      next.add(puuid);
    }
    setGuesses(next);
  };

  const handleReveal = () => {
    setRevealed(true);
    setScore((prev) => ({ ...prev, total: prev.total + 1 }));

    const guessedPuuids = [...guesses];
    const actualPuuids = shamefulPlayers.map((c) => c.user.puuid);

    const isCorrect =
      guessedPuuids.length === actualPuuids.length &&
      guessedPuuids.every((g) => actualPuuids.includes(g));

    if (isCorrect) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const getResultStatus = (c: YuumiRound["candidates"][0]) => {
    if (!revealed) return null;
    const wasGuessed = guesses.has(c.user.puuid);
    if (c.isLessThanYuumi && wasGuessed) return "correct-positive";
    if (!c.isLessThanYuumi && !wasGuessed) return "correct-negative";
    if (c.isLessThanYuumi && !wasGuessed) return "missed";
    return "wrong";
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>{t("yuumiShame.title")}</h2>
        {streak > 0 && (
          <span style={{ fontSize: 13, color: "#fcd34d", fontWeight: 700, textShadow: "0 0 10px rgba(251, 191, 36, 0.4)" }}>
            Streak: {streak}
          </span>
        )}
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("yuumiShame.subtitle")} &middot; {duration(match.info.gameDuration)}
      </p>
      <p className="muted" style={{ fontSize: 12 }}>
        {t("yuumiShame.scoreLabel")} {score.correct}/{score.total}
      </p>

      {/* Yuumi reference card */}
      <div
        className="card"
        style={{
          maxWidth: 500,
          margin: "0 auto 24px",
          textAlign: "center",
          borderTop: "2px solid var(--accent)",
          padding: "20px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={championIcon(yuumi.championId)}
          alt="Yuumi"
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-sm)",
            border: "2px solid var(--accent)",
            boxShadow: "0 0 15px rgba(200, 155, 60, 0.3)",
            marginBottom: 8,
          }}
        />
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-3)" }}>
          Yuumi
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          {yuumi.riotIdGameName || yuumi.summonerName || "???"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text-bright)",
            letterSpacing: "0.05em",
          }}
        >
          {yuumiDmg.toLocaleString(lang)}
        </div>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {t("yuumiShame.damageDealt")}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          KDA: {yuumi.kills}/{yuumi.deaths}/{yuumi.assists}
        </div>
      </div>

      {/* Question */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h3 style={{ color: "var(--loss)", fontSize: 16, fontWeight: 800 }}>
          {t("yuumiShame.question")}
        </h3>
        {shamefulPlayers.length === 0 && !revealed && (
          <p className="muted" style={{ fontSize: 12 }}>
            {t("yuumiShame.hint")}
          </p>
        )}
      </div>

      {/* Player cards to pick from */}
      <div className="grid cols-2" style={{ maxWidth: 700, margin: "0 auto" }}>
        {candidates.map((c) => {
          const isSelected = guesses.has(c.user.puuid);
          const status = getResultStatus(c);

          let borderColor = isSelected ? "var(--accent)" : "var(--border)";
          let bgExtra = "";
          let statusLabel = "";

          if (revealed) {
            if (status === "correct-positive") {
              borderColor = "var(--win)";
              bgExtra = "rgba(10, 200, 185, 0.08)";
              statusLabel = t("yuumiShame.correctPick");
            } else if (status === "missed") {
              borderColor = "var(--loss)";
              bgExtra = "rgba(232, 64, 87, 0.08)";
              statusLabel = t("yuumiShame.missed");
            } else if (status === "wrong") {
              borderColor = "var(--loss)";
              bgExtra = "rgba(232, 64, 87, 0.05)";
              statusLabel = t("yuumiShame.wrongPick");
            } else {
              borderColor = "var(--win)";
              bgExtra = "rgba(10, 200, 185, 0.03)";
              statusLabel = t("yuumiShame.safe");
            }
          }

          return (
            <div
              key={c.user.puuid}
              onClick={() => handleGuess(c.user.puuid)}
              className="card"
              style={{
                cursor: revealed ? "default" : "pointer",
                border: `2px solid ${borderColor}`,
                boxShadow: isSelected && !revealed ? "0 0 15px rgba(200, 155, 60, 0.2)" : "none",
                background: bgExtra || undefined,
                transition: "var(--transition)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={championIcon(c.p.championId)}
                alt={c.p.championName}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-sm)",
                  border: `1.5px solid ${borderColor}`,
                }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {c.user.gameName}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> #{c.user.tagLine}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {c.p.championName} &middot; {c.p.teamPosition || "?"} &middot; {c.p.kills}/{c.p.deaths}/{c.p.assists}
                </div>
                {revealed && (
                  <div style={{
                    fontSize: 14,
                    fontWeight: 800,
                    marginTop: 6,
                    color: c.isLessThanYuumi ? "var(--loss)" : "var(--win)",
                  }}>
                    {c.p.totalDamageDealtToChampions.toLocaleString(lang)} DMG
                    {c.isLessThanYuumi && (
                      <span style={{ fontSize: 11, marginLeft: 8 }}>
                        ({(yuumiDmg - c.p.totalDamageDealtToChampions).toLocaleString(lang)} {t("yuumiShame.lessLabel")})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!revealed && isSelected && (
                <span style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 8px rgba(200, 155, 60, 0.5)",
                  flexShrink: 0,
                }} />
              )}

              {revealed && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: (status === "correct-positive" || status === "correct-negative") ? "var(--win)" : "var(--loss)",
                  flexShrink: 0,
                }}>
                  {statusLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        {!revealed ? (
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <button
              onClick={handleReveal}
              style={{ minWidth: 200 }}
            >
              {guesses.size === 0 ? t("yuumiShame.revealNone") : t("yuumiShame.reveal")}
            </button>
          </div>
        ) : (
          <div>
            {/* Result message */}
            {shamefulPlayers.length === 0 ? (
              <p className="win" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                {t("yuumiShame.noShame")}
              </p>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {(() => {
                  const guessedAll = shamefulPlayers.every((sp) => guesses.has(sp.user.puuid));
                  const noExtraWrong = [...guesses].every((g) => shamefulPlayers.some((sp) => sp.user.puuid === g));
                  const perfect = guessedAll && noExtraWrong;

                  return perfect ? (
                    <p className="win" style={{ fontSize: 14, fontWeight: 700 }}>
                      {t("yuumiShame.perfect")}
                    </p>
                  ) : (
                    <p className="loss" style={{ fontSize: 14, fontWeight: 700 }}>
                      {t("yuumiShame.wrong")}
                    </p>
                  );
                })()}

                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {shamefulPlayers.map((sp) => (
                    <span key={sp.user.puuid} style={{ color: "var(--loss)", fontWeight: 700 }}>
                      {sp.user.gameName} ({sp.p.totalDamageDealtToChampions.toLocaleString(lang)})
                      {" "}
                    </span>
                  ))}
                  <span>
                    {"< Yuumi ("}
                    {yuumiDmg.toLocaleString(lang)}
                    {")"}
                  </span>
                </div>

                {shamefulPlayers.length > 0 && (
                  <p className="muted" style={{ fontStyle: "italic", marginTop: 8, fontSize: 12 }}>
                    {(t("yuumiShame.roasts") as unknown as string[])[Math.floor(Math.random() * (t("yuumiShame.roasts") as unknown as string[]).length)]}
                  </p>
                )}
              </div>
            )}

            <button onClick={newRound} style={{ minWidth: 200 }}>
              {t("yuumiShame.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
