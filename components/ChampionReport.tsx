import { useState, useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { userChampReport, ChampStat } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { num, pct } from "@/lib/format";
import { COPY, wrRoast } from "@/lib/humor";

type ChampMiniProps = {
  label: string;
  stat?: ChampStat;
  good: boolean;
};

const ChampMini = (props: ChampMiniProps) => {
  const { label, stat, good } = props;
  if (!stat)
    return (
      <div>
        <div className="muted" style={{ fontSize: 12 }}>{label}</div>
        <div className="muted">yeterli maç yok</div>
      </div>
    );
  return (
    <div>
      <div className={good ? "win" : "loss"} style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </div>
      <ChampBadge
        championId={stat.championId}
        name={stat.championName}
        small
        sub={`${pct(stat.winRate)} WR · ${num(stat.avgKda, 2)} KDA · ${stat.games} maç`}
      />
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        “{wrRoast(stat.winRate, stat.games)}”
      </div>
    </div>
  );
};

type PlayerChampTableProps = {
  champs: ChampStat[];
};

const PlayerChampTable = (props: PlayerChampTableProps) => {
  const { champs } = props;
  const [sortBy, setSortBy] = useState<"name" | "games" | "winRate" | "kda">("games");
  const [ascending, setAscending] = useState(false);

  const sortedChamps = useMemo(() => {
    return [...champs].sort((a, b) => {
      let valA: any = a.games;
      let valB: any = b.games;
      if (sortBy === "name") {
        valA = a.championName;
        valB = b.championName;
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === "winRate") {
        valA = a.winRate;
        valB = b.winRate;
      } else if (sortBy === "kda") {
        valA = a.avgKda;
        valB = b.avgKda;
      }
      return ascending ? valA - valB : valB - valA;
    });
  }, [champs, sortBy, ascending]);

  const handleSort = (field: "name" | "games" | "winRate" | "kda") => {
    if (sortBy === field) {
      setAscending(!ascending);
    } else {
      setSortBy(field);
      setAscending(false);
    }
  };

  return (
    <table style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>
            Şampiyon {sortBy === "name" && (ascending ? "▲" : "▼")}
          </th>
          <th style={{ cursor: "pointer" }} onClick={() => handleSort("games")}>
            Maç {sortBy === "games" && (ascending ? "▲" : "▼")}
          </th>
          <th style={{ cursor: "pointer" }} onClick={() => handleSort("winRate")}>
            WR {sortBy === "winRate" && (ascending ? "▲" : "▼")}
          </th>
          <th style={{ cursor: "pointer" }} onClick={() => handleSort("kda")}>
            KDA {sortBy === "kda" && (ascending ? "▲" : "▼")}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedChamps.map((c) => (
          <tr key={c.championName}>
            <td>{c.championName}</td>
            <td>{c.games}</td>
            <td className={c.winRate >= 0.5 ? "win" : "loss"}>
              {pct(c.winRate)}
            </td>
            <td>{num(c.avgKda, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function getGamerTier(winRate: number, totalGames: number) {
  if (totalGames === 0) return { label: "UNRANKED", className: "tier-ur", desc: "Henüz maçı yok" };
  if (totalGames < 3) return { label: "ÇIRAK", className: "tier-apprentice", desc: "Gelişmekte olan oyuncu" };
  if (winRate > 0.55) return { label: "S+ ALLAH", className: "tier-god", desc: "İlah gibi oynuyor, flexin efendisi" };
  if (winRate >= 0.50) return { label: "A CARRY", className: "tier-carry", desc: "Sırtlayıcı güç, güvenli liman" };
  return { label: "F MAL", className: "tier-feeder", desc: "Takıma yük olan, feedleyen mal" };
}

type ChampionReportProps = {
  users: TrackedUser[];
  matches: Match[];
};

export const ChampionReport = (props: ChampionReportProps) => {
  const { users, matches } = props;
  const [playerSort, setPlayerSort] = useState<"games" | "winRate" | "bestWr" | "name">("winRate");

  const reports = useMemo(() => {
    return users.map((u) => userChampReport(u, matches));
  }, [users, matches]);

  const sortedReports = useMemo(() => {
    const mapped = reports.map((r) => {
      const totalWins = matches.filter((m) => {
        const p = m.info.participants.find((p) => p.puuid === r.user.puuid);
        return p && p.win;
      }).length;
      const winRate = r.totalGames > 0 ? totalWins / r.totalGames : 0;
      const bestWr = r.best ? r.best.winRate : -1;
      return { ...r, totalWins, winRate, bestWr };
    });

    return mapped.sort((a, b) => {
      if (playerSort === "winRate") {
        return b.winRate - a.winRate || b.totalGames - a.totalGames;
      }
      if (playerSort === "games") {
        return b.totalGames - a.totalGames || b.winRate - a.winRate;
      }
      if (playerSort === "bestWr") {
        return b.bestWr - a.bestWr || b.totalGames - a.totalGames;
      }
      return a.user.gameName.localeCompare(b.user.gameName);
    });
  }, [reports, playerSort, matches]);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2>Kim neyle tanrı, kim neyle besleme</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            Winrate&apos;e göre (en az 2 maç oynanan şampiyonlar arasından).
          </p>
        </div>
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">Sıralama Ölçütü:</span>
          <select
            value={playerSort}
            onChange={(e) => setPlayerSort(e.target.value as any)}
          >
            <option value="winRate">Genel Win Rate</option>
            <option value="games">Toplam Flex Maçı</option>
            <option value="bestWr">En İyi Şampiyon WR</option>
            <option value="name">Alfabetik İsim</option>
          </select>
        </label>
      </div>

      <div className="grid cols-2">
        {sortedReports.map((r) => {
          const tier = getGamerTier(r.winRate, r.totalGames);
          return (
            <div className="card gamer-card" key={r.user.puuid}>
              <div className="stat-line" style={{ alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>
                    {r.user.gameName}
                    <span className="muted" style={{ fontWeight: 400 }}> #{r.user.tagLine}</span>
                  </strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.user.platform.toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`gamer-tier ${tier.className}`} title={tier.desc}>
                    {tier.label}
                  </span>
                </div>
              </div>

              {/* Win/Loss Split progress bar */}
              {r.totalGames > 0 && (
                <div className="win-loss-container">
                  <div className="win-loss-bar">
                    <div className="win-fill" style={{ width: `${(r.totalWins / r.totalGames) * 100}%` }} />
                    <div className="loss-fill" style={{ width: `${((r.totalGames - r.totalWins) / r.totalGames) * 100}%` }} />
                  </div>
                  <div className="win-loss-text">
                    <span className="win">{r.totalWins}G</span>
                    <span className="muted"> - </span>
                    <span className="loss">{r.totalGames - r.totalWins}M</span>
                    <span className="muted" style={{ marginLeft: 8 }}>({pct(r.winRate)} WR)</span>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 18,
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <ChampMini label={COPY.bestChamp} stat={r.best} good />
                <ChampMini label={COPY.worstChamp} stat={r.worst} good={false} />
              </div>
              {r.champs.length > 0 && (
                <details style={{ marginTop: 14 }}>
                  <summary className="muted" style={{ cursor: "pointer", fontWeight: 600 }}>
                    Tüm şampiyonlar ({r.champs.length}) — tıklanabilir sıralama
                  </summary>
                  <PlayerChampTable champs={r.champs} />
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
