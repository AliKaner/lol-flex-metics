"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";
import { userParticipations, kda, csPerMin, killParticipation } from "@/lib/analysis";
import { championIcon } from "@/lib/assets";
import { duration, kdaStr, num } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { translations } from "@/lib/translations";

interface Round {
  user: TrackedUser;
  match: Match;
  p: MatchParticipant;
  options: {
    id: string; // puuid or championId string
    label: string; // gameName or championName
    championId?: number;
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

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function GuessGame({
  users,
  matches,
  mode = "player",
}: {
  users: TrackedUser[];
  matches: Match[];
  mode?: "player" | "champion";
}) {
  const { t, lang } = useTranslation();
  const [round, setRound] = useState<Round | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [flavor, setFlavor] = useState("");

  const rightReplies = translations[lang].guessGame.rightReplies;
  const wrongReplies = translations[lang].guessGame.wrongReplies;

  const newRound = useCallback(() => {
    const playable = users.filter(
      (u) => userParticipations(matches, u.puuid).length > 0
    );
    if (playable.length < 2) {
      setRound(null);
      return;
    }
    const user = playable[Math.floor(Math.random() * playable.length)];
    const parts = userParticipations(matches, user.puuid);
    const { match, p } = parts[Math.floor(Math.random() * parts.length)];

    if (mode === "player") {
      // Guess Player Mode
      const distractors = shuffle(users.filter((u) => u.puuid !== user.puuid)).slice(0, 3);
      const options = shuffle([user, ...distractors]).map((o) => ({
        id: o.puuid,
        label: `${o.gameName}#${o.tagLine}`,
      }));
      setRound({ user, match, p, options });
    } else {
      // Guess Champion Mode
      const distractors = shuffle(
        match.info.participants
          .filter((x) => x.championId !== p.championId)
      )
        .slice(0, 3)
        .map((x) => ({
          id: String(x.championId),
          label: x.championName,
          championId: x.championId,
        }));

      const correctOption = {
        id: String(p.championId),
        label: p.championName,
        championId: p.championId,
      };

      const options = shuffle([correctOption, ...distractors]);
      setRound({ user, match, p, options });
    }

    setGuesses([]);
    setSolved(false);
    setFlavor("");
  }, [users, matches, mode]);

  useEffect(() => {
    newRound();
  }, [newRound]);

  if (!round)
    return (
      <div className="empty">
        {t("guessGame.notEnoughUsersGuess")}
      </div>
    );

  const { user, match, p, options } = round;
  const revealChamp = mode === "player" ? (guesses.length >= 1 || solved) : true;
  const revealPlayer = mode === "champion" ? true : solved;

  const guess = (id: string) => {
    if (solved || guesses.includes(id)) return;
    const isCorrect = mode === "player" ? id === user.puuid : id === String(p.championId);
    const nextGuesses = [...guesses, id];
    setGuesses(nextGuesses);

    if (isCorrect) {
      setSolved(true);
      setFlavor(pick(rightReplies));
      setStreak((s) => s + 1);
      setScore((s) => ({
        correct: s.correct + (nextGuesses.length === 1 ? 1 : 0),
        total: s.total + 1,
      }));
    } else {
      setFlavor(pick(wrongReplies));
      setStreak(0);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h3>
          {mode === "player" ? t("guessGame.title") : t("guessGame.champModeTitle")}
        </h3>
        {streak > 0 && (
          <span style={{ fontSize: 13, color: "#fcd34d", fontWeight: 700, textShadow: "0 0 10px rgba(251, 191, 36, 0.4)" }}>
            Streak: 🔥 {streak}
          </span>
        )}
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {mode === "player"
          ? t("guessGame.subtitle")
          : t("guessGame.champModeSub", { name: `<strong>${user.gameName}#${user.tagLine}</strong>` })}{" "}
        {t("guessGame.scoreLabel")} {score.correct}/{score.total} {t("guessGame.firstTryOnly")}.
      </p>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto", border: "1.5px solid var(--border)" }}>
        <div className="champ" style={{ marginBottom: 16 }}>
          {revealChamp ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={championIcon(p.championId)}
              alt={p.championName}
              style={{ width: 56, height: 56, borderRadius: 10, border: "2px solid var(--border)" }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                background: "var(--panel)",
                border: "2px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              ?
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {mode === "player"
                ? (revealChamp ? p.championName : t("guessGame.hiddenChamp"))
                : (revealPlayer ? `${user.gameName}#${user.tagLine}` : t("guessGame.hiddenPlayer"))}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {p.teamPosition || "—"} · {duration(match.info.gameDuration)} ·{" "}
              <span className={p.win ? "win" : "loss"} style={{ fontWeight: 700 }}>
                {p.win ? t("highlights.victoryLabel") : t("highlights.defeatLabel")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid cols-3" style={{ gap: 8, marginBottom: 16 }}>
          <Stat label="KDA" value={kdaStr(p)} sub={`${num(kda(p), 2)}`} />
          <Stat label="KP" value={`${Math.round(killParticipation(match, p) * 100)}%`} />
          <Stat label="CS/dk" value={num(csPerMin(match, p), 1)} />
          <Stat label={t("guessGame.damage")} value={p.totalDamageDealtToChampions.toLocaleString(lang)} />
          <Stat label={t("guessGame.vision")} value={String(p.visionScore)} />
          <Stat label={t("guessGame.level")} value={String(p.champLevel)} />
        </div>

        <h4 style={{ marginTop: 16, marginBottom: 10, fontSize: 15 }}>
          {mode === "player" ? t("guessGame.guessWho") : t("guessGame.hiddenChamp") + "?"}
        </h4>
        <div className="kbd-options">
          {options.map((o) => {
            const guessed = guesses.includes(o.id);
            const isAnswer = mode === "player" ? o.id === user.puuid : o.id === String(p.championId);
            let cls = "";
            if (solved && isAnswer) cls = "correct";
            else if (guessed && !isAnswer) cls = "wrong";
            return (
              <button
                key={o.id}
                className={cls}
                onClick={() => guess(o.id)}
                disabled={solved || guessed}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                }}
              >
                {o.championId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={championIcon(o.championId)}
                    alt={o.label}
                    style={{ width: 24, height: 24, borderRadius: 4 }}
                  />
                )}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>

        {!solved && guesses.length > 0 && (
          <p className="loss" style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>
            {flavor} {guesses.length === 1 && mode === "player" && `(${t("guessGame.champHint")})`}
          </p>
        )}
        {solved && (
          <p className="win" style={{ marginTop: 12, fontSize: 13, fontWeight: 700 }}>
            {flavor} <strong>{user.gameName}</strong>, {t("guessGame.withChamp")} {p.championName}.
          </p>
        )}

        <button
          className="ghost"
          style={{ marginTop: 14, width: "100%" }}
          onClick={newRound}
        >
          {solved ? t("guessGame.nextRound") : t("guessGame.skipRound")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 10, textAlign: "center", borderRadius: 8, background: "rgba(13, 20, 33, 0.4)" }}>
      <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 15, margin: "2px 0", color: "#fff" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 10 }}>{sub}</div>}
    </div>
  );
}
