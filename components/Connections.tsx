"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { pairSynergies, PairSynergy } from "@/lib/analysis";
import { COPY } from "@/lib/humor";

function liftStr(lift: number) {
  const sign = lift >= 0 ? "+" : "";
  return `${sign}${(lift * 100).toFixed(0)}%`;
}

function Sentence({ s }: { s: PairSynergy }) {
  const up = s.lift >= 0;
  return (
    <li style={{ marginBottom: 8 }}>
      <strong>{s.a.gameName}</strong> + <strong>{s.b.gameName}</strong> birlikte
      olunca winrate{" "}
      <span className={up ? "win" : "loss"} style={{ fontWeight: 700 }}>
        {liftStr(s.lift)}
      </span>{" "}
      {up ? "artıyor" : "düşüyor"}{" "}
      <span className="muted">
        ({s.games} maç, birlikte {(s.togetherWR * 100).toFixed(0)}% WR
        {!s.enough && " · az örneklem"})
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
  const [minGames, setMinGames] = useState(3);
  const all = useMemo(
    () => pairSynergies(users, matches, minGames),
    [users, matches, minGames]
  );

  if (users.length < 2)
    return <div className="empty">Bağlantı analizi için en az 2 oyuncu ekle.</div>;

  const enough = all.filter((s) => s.enough);
  const pool = enough.length > 0 ? enough : all;
  const positive = pool.filter((s) => s.lift > 0);
  const negative = pool.filter((s) => s.lift < 0).reverse();

  return (
    <div>
      <h2>Kim kimi taşıyor, kim kimi batırıyor</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        Hangi ikililer birlikteyken takım winrate&apos;i artıyor ya da dibe
        vuruyor. Eğilim gösterir; maç sayısı her zaman belirtilir (suçu örnekleme
        atmadan önce).
      </p>

      <label className="row" style={{ gap: 8, marginBottom: 16 }}>
        <span className="muted">Min. birlikte maç:</span>
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
          <h3 className="win">{COPY.positiveSynergy}</h3>
          {positive.length === 0 ? (
            <p className="muted">Pozitif sinerji bulunamadı.</p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {positive.map((s, i) => (
                <Sentence key={i} s={s} />
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="loss">{COPY.negativeSynergy}</h3>
          {negative.length === 0 ? (
            <p className="muted">Negatif sinerji bulunamadı.</p>
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
