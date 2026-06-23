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
  options: TrackedUser[];
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
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t, lang } = useTranslation();
  const [round, setRound] = useState<Round | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [flavor, setFlavor] = useState("");

  const rightReplies = translations[lang].guessGame.rightReplies;
  const wrongReplies = translations[lang].guessGame.wrongReplies;

  const newRound = useCallback(() => {
    // En az 1 maçı olan oyuncular
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

    // Şıklar: doğru + en fazla 3 çeldirici
    const distractors = shuffle(users.filter((u) => u.puuid !== user.puuid)).slice(0, 3);
    const options = shuffle([user, ...distractors]);

    setRound({ user, match, p, options });
    setGuesses([]);
    setSolved(false);
    setFlavor("");
  }, [users, matches]);

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
  const revealChamp = guesses.length >= 1 || solved;

  const guess = (puuid: string) => {
    if (solved || guesses.includes(puuid)) return;
    const isCorrect = puuid === user.puuid;
    const nextGuesses = [...guesses, puuid];
    setGuesses(nextGuesses);
    if (isCorrect) {
      setSolved(true);
      setFlavor(pick(rightReplies));
      setScore((s) => ({
        correct: s.correct + (nextGuesses.length === 1 ? 1 : 0),
        total: s.total + 1,
      }));
    } else {
      setFlavor(pick(wrongReplies));
    }
  };

  return (
    <div>
      <h2>{t("guessGame.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("guessGame.subtitle")} {t("guessGame.scoreLabel")} {score.correct}/{score.total} {t("guessGame.firstTryOnly")}.
      </p>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="champ" style={{ marginBottom: 12 }}>
          {revealChamp ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={championIcon(p.championId)}
              alt={p.championName}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                background: "var(--panel)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ?
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {revealChamp ? p.championName : t("guessGame.hiddenChamp")}
            </div>
            <div className="muted">
              {p.teamPosition || "—"} · {duration(match.info.gameDuration)} ·{" "}
              <span className={p.win ? "win" : "loss"}>
                {p.win ? t("highlights.victoryLabel") : t("highlights.defeatLabel")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid cols-3" style={{ gap: 8 }}>
          <Stat label="KDA" value={kdaStr(p)} sub={`${num(kda(p), 2)}`} />
          <Stat label="KP" value={`${Math.round(killParticipation(match, p) * 100)}%`} />
          <Stat label="CS/dk" value={num(csPerMin(match, p), 1)} />
          <Stat label="Hasar" value={p.totalDamageDealtToChampions.toLocaleString(lang)} />
          <Stat label={t("guessGame.vision")} value={String(p.visionScore)} />
          <Stat label={t("guessGame.level")} value={String(p.champLevel)} />
        </div>

        <h3 style={{ marginTop: 16 }}>{t("guessGame.guessWho")}</h3>
        <div className="kbd-options">
          {options.map((o) => {
            const guessed = guesses.includes(o.puuid);
            const isAnswer = o.puuid === user.puuid;
            let cls = "";
            if (solved && isAnswer) cls = "correct";
            else if (guessed && !isAnswer) cls = "wrong";
            return (
              <button
                key={o.puuid}
                className={cls}
                onClick={() => guess(o.puuid)}
                disabled={solved || guessed}
              >
                {o.gameName}
                <span className="muted"> #{o.tagLine}</span>
              </button>
            );
          })}
        </div>

        {!solved && guesses.length > 0 && (
          <p className="loss" style={{ marginTop: 12 }}>
            {flavor} {guesses.length === 1 && `(${t("guessGame.champHint")})`}
          </p>
        )}
        {solved && (
          <p className="win" style={{ marginTop: 12 }}>
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
    <div className="card" style={{ padding: 10, textAlign: "center" }}>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}
