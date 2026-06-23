"use client";

import { useMemo, useState } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { comboStats } from "@/lib/analysis";
import { pct } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

export function ComboAnalysis({
  users,
  matches,
}: {
  users: TrackedUser[];
  matches: Match[];
}) {
  const { t } = useTranslation();
  const [size, setSize] = useState<3 | 5>(3);
  const [onlyPlayed, setOnlyPlayed] = useState(true);
  const [sortBy, setSortBy] = useState<"games" | "winRate">("games");

  const stats = useMemo(
    () => comboStats(users, matches, size),
    [users, matches, size]
  );

  const filtered = useMemo(() => {
    const list = onlyPlayed ? stats : stats;
    return [...list].sort((a, b) =>
      sortBy === "games"
        ? b.games - a.games || b.winRate - a.winRate
        : b.winRate - a.winRate || b.games - a.games
    );
  }, [stats, sortBy, onlyPlayed]);

  if (users.length < size) {
    return (
      <div className="empty">
        {t("comboAnalysis.notEnoughUsers", { size, count: users.length })}
      </div>
    );
  }

  return (
    <div>
      <h2>{t("comboAnalysis.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("comboAnalysis.subtitle", { size })}
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value) as 3 | 5)}
        >
          <option value={3}>{t("comboAnalysis.combosSize3")}</option>
          <option value={5}>{t("comboAnalysis.combosSize5")}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "games" | "winRate")}>
          <option value="games">{t("comboAnalysis.sortByGames")}</option>
          <option value="winRate">{t("comboAnalysis.sortByWinRate")}</option>
        </select>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyPlayed}
            onChange={(e) => setOnlyPlayed(e.target.checked)}
            style={{ width: 16 }}
          />
          <span className="muted">{t("comboAnalysis.onlyPlayed")}</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {t("comboAnalysis.noCombosFound")}
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("comboAnalysis.team")}</th>
              <th>{t("comboAnalysis.playedTogether")}</th>
              <th>{t("comboAnalysis.victory")}</th>
              <th>{t("comboAnalysis.wr")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td>{c.members.map((m) => m.gameName).join(" + ")}</td>
                <td>{c.games}</td>
                <td>
                  <span className="win">{c.wins}</span> /{" "}
                  <span className="loss">{c.games - c.wins}</span>
                </td>
                <td className={c.winRate >= 0.5 ? "win" : "loss"}>
                  {pct(c.winRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
