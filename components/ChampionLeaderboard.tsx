import { useState, useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { championLeaderboard } from "@/lib/analysis";
import { ChampBadge } from "./ChampBadge";
import { num, pct } from "@/lib/format";

type ChampionLeaderboardProps = {
  users: TrackedUser[];
  matches: Match[];
};

export const ChampionLeaderboard = (props: ChampionLeaderboardProps) => {
  const { users, matches } = props;
  const [q, setQ] = useState("");
  const [championSort, setChampionSort] = useState<"games" | "alphabetical" | "players" | "winRate">("games");
  const [playerSortBy, setPlayerSortBy] = useState<"winRate" | "games" | "kda">("winRate");

  const rows = useMemo(() => {
    const list = championLeaderboard(users, matches);

    // Her şampiyonun altındaki oyuncuları seçilen ölçüte göre yeniden sırala
    const mapped = list.map((row) => {
      const sortedEntries = [...row.entries].sort((a, b) => {
        if (playerSortBy === "games") {
          return b.stat.games - a.stat.games || b.stat.winRate - a.stat.winRate;
        }
        if (playerSortBy === "kda") {
          return b.stat.avgKda - a.stat.avgKda || b.stat.winRate - a.stat.winRate;
        }
        return b.stat.winRate - a.stat.winRate || b.stat.avgKda - a.stat.avgKda;
      });
      return { ...row, entries: sortedEntries };
    });

    // Şampiyon kartlarını seçilen ölçüte göre sırala
    return mapped.sort((a, b) => {
      if (championSort === "alphabetical") {
        return a.championName.localeCompare(b.championName);
      }
      if (championSort === "players") {
        return b.entries.length - a.entries.length || a.championName.localeCompare(b.championName);
      }
      if (championSort === "winRate") {
        const maxA = a.entries.length > 0 ? Math.max(...a.entries.map((e) => e.stat.winRate)) : -1;
        const maxB = b.entries.length > 0 ? Math.max(...b.entries.map((e) => e.stat.winRate)) : -1;
        return maxB - maxA || a.championName.localeCompare(b.championName);
      }
      // "games"
      const gamesA = a.entries.reduce((sum, e) => sum + e.stat.games, 0);
      const gamesB = b.entries.reduce((sum, e) => sum + e.stat.games, 0);
      return gamesB - gamesA || a.championName.localeCompare(b.championName);
    });
  }, [users, matches, championSort, playerSortBy]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      r.championName.toLowerCase().includes(q.toLowerCase())
    );
  }, [rows, q]);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2>Şampiyon bazlı sıralama</h2>
          <p className="muted" style={{ marginTop: -8 }}>
            Her şampiyonun altında, o şampiyonu oynayan oyuncular başarılarına göre sıralanır.
          </p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <label className="row" style={{ gap: 6 }}>
            <span className="muted">Şampiyon Sıralaması:</span>
            <select
              value={championSort}
              onChange={(e) => setChampionSort(e.target.value as any)}
            >
              <option value="games">Toplam Maç</option>
              <option value="winRate">En Yüksek WR (Oyuncu)</option>
              <option value="players">Oyuncu Sayısı</option>
              <option value="alphabetical">Alfabetik</option>
            </select>
          </label>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <input
          placeholder="Şampiyon ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 240 }}
        />
        <span className="muted" style={{ fontSize: 12 }}>
          * Tablo başlıklarına (<strong>Maç, WR, KDA</strong>) tıklayarak oyuncuları sıralayabilirsin.
        </span>
      </div>

      {filteredRows.length === 0 && <div className="empty">Veri yok.</div>}

      <div className="grid cols-2">
        {filteredRows.map((row) => (
          <div className="card champ-leaderboard-card" key={row.championName}>
            <ChampBadge
              championId={row.championId}
              name={row.championName}
              sub={`${row.entries.length} oyuncu oynadı`}
            />
            <table style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Oyuncu</th>
                  <th
                    style={{ cursor: "pointer", color: playerSortBy === "games" ? "var(--accent)" : undefined }}
                    onClick={() => setPlayerSortBy("games")}
                    title="Toplam maça göre sırala"
                  >
                    Maç {playerSortBy === "games" && "▼"}
                  </th>
                  <th
                    style={{ cursor: "pointer", color: playerSortBy === "winRate" ? "var(--accent)" : undefined }}
                    onClick={() => setPlayerSortBy("winRate")}
                    title="Win Rate'e göre sırala"
                  >
                    WR {playerSortBy === "winRate" && "▼"}
                  </th>
                  <th
                    style={{ cursor: "pointer", color: playerSortBy === "kda" ? "var(--accent)" : undefined }}
                    onClick={() => setPlayerSortBy("kda")}
                    title="KDA'ya göre sırala"
                  >
                    KDA {playerSortBy === "kda" && "▼"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.entries.map((e, i) => (
                  <tr key={e.user.puuid}>
                    <td className="gold">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{e.user.gameName}</td>
                    <td>{e.stat.games}</td>
                    <td className={e.stat.winRate >= 0.5 ? "win" : "loss"}>
                      {pct(e.stat.winRate)}
                    </td>
                    <td>{num(e.stat.avgKda, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};
