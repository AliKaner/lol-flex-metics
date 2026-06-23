"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { pairSynergies, PairSynergy } from "@/lib/analysis";
import { useTranslation } from "@/lib/i18n";

function liftStr(lift: number) {
  const sign = lift >= 0 ? "+" : "";
  return `${sign}${(lift * 100).toFixed(0)}%`;
}

function Sentence({ s }: { s: PairSynergy }) {
  const { t } = useTranslation();
  const up = s.lift >= 0;
  return (
    <li style={{ marginBottom: 8 }}>
      <strong>{s.a.gameName}</strong> + <strong>{s.b.gameName}</strong> {t("connections.togetherText")}{" "}
      <span className={up ? "win" : "loss"} style={{ fontWeight: 700 }}>
        {liftStr(s.lift)}
      </span>{" "}
      {up ? t("connections.liftUp") : t("connections.liftDown")}{" "}
      <span className="muted">
        ({s.games} {t("connections.matchesLabel")}, {t("connections.togetherWRLabel")} {(s.togetherWR * 100).toFixed(0)}% WR
        {!s.enough && ` · ${t("connections.notEnoughMatches")}`})
      </span>
    </li>
  );
}

export function Connections({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();
  const [minGames, setMinGames] = useState(3);
  const all = useMemo(
    () => pairSynergies(users, matches, minGames),
    [users, matches, minGames]
  );

  if (users.length < 2)
    return <div className="empty">{t("connections.emptyConnections")}</div>;

  const enough = all.filter((s) => s.enough);
  const pool = enough.length > 0 ? enough : all;
  const positive = pool.filter((s) => s.lift > 0);
  const negative = pool.filter((s) => s.lift < 0).reverse();

  return (
    <div>
      <h2>{t("connections.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("connections.subtitle")}
      </p>

      <label className="row" style={{ gap: 8, marginBottom: 16 }}>
        <span className="muted">{t("connections.minMatches")}</span>
        <input
          type="number"
          min={1}
          max={20}
          value={minGames}
          onChange={(e) => setMinGames(Math.max(1, Number(e.target.value)))}
          style={{ width: 70 }}
        />
      </label>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="win">{t("connections.positiveSynergy")}</h3>
          {positive.length === 0 ? (
            <p className="muted">{t("connections.noPositiveSynergy")}</p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {positive.map((s, i) => (
                <Sentence key={i} s={s} />
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="loss">{t("connections.negativeSynergy")}</h3>
          {negative.length === 0 ? (
            <p className="muted">{t("connections.noNegativeSynergy")}</p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {negative.map((s, i) => (
                <Sentence key={i} s={s} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
