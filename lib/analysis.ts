import type { Match, MatchParticipant, TrackedUser } from "@/types/riot";

// ----------------- yardımcılar -----------------

export function kda(p: { kills: number; deaths: number; assists: number }) {
  return (p.kills + p.assists) / Math.max(1, p.deaths);
}

export function findParticipant(
  match: Match,
  puuid: string
): MatchParticipant | undefined {
  return match.info.participants.find((p) => p.puuid === puuid);
}

function teamKills(match: Match, teamId: number): number {
  return match.info.participants
    .filter((p) => p.teamId === teamId)
    .reduce((s, p) => s + p.kills, 0);
}

export function killParticipation(
  match: Match,
  p: MatchParticipant
): number {
  const tk = teamKills(match, p.teamId);
  return tk > 0 ? (p.kills + p.assists) / tk : 0;
}

export function csPerMin(match: Match, p: MatchParticipant): number {
  const min = match.info.gameDuration / 60;
  return min > 0 ? (p.totalMinionsKilled + p.neutralMinionsKilled) / min : 0;
}

// Tek bir maçtaki performans puanı (en iyi/kötü maç sıralaması için).
export function performanceRating(match: Match, p: MatchParticipant): number {
  const k = kda(p);
  const kp = killParticipation(match, p);
  const cspm = csPerMin(match, p);
  return (
    k * 2 +
    kp * 10 +
    cspm * 0.3 +
    (p.win ? 3 : 0) +
    p.largestMultiKill * 1.5 -
    p.deaths * 0.4
  );
}

// ----------------- şampiyon istatistikleri -----------------

export interface ChampStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}

function aggregateChamps(parts: { match: Match; p: MatchParticipant }[]) {
  const map = new Map<string, ChampStat & { _kdaSum: number; _k: number; _d: number; _a: number }>();
  for (const { p } of parts) {
    const key = p.championName;
    let s = map.get(key);
    if (!s) {
      s = {
        championId: p.championId,
        championName: p.championName,
        games: 0,
        wins: 0,
        winRate: 0,
        avgKda: 0,
        avgKills: 0,
        avgDeaths: 0,
        avgAssists: 0,
        _kdaSum: 0,
        _k: 0,
        _d: 0,
        _a: 0,
      };
      map.set(key, s);
    }
    s.games++;
    if (p.win) s.wins++;
    s._kdaSum += kda(p);
    s._k += p.kills;
    s._d += p.deaths;
    s._a += p.assists;
  }
  return [...map.values()].map((s) => ({
    championId: s.championId,
    championName: s.championName,
    games: s.games,
    wins: s.wins,
    winRate: s.wins / s.games,
    avgKda: s._kdaSum / s.games,
    avgKills: s._k / s.games,
    avgDeaths: s._d / s.games,
    avgAssists: s._a / s.games,
  }));
}

// Bir kullanıcının tüm flex maçlarındaki katılımları.
export function userParticipations(matches: Match[], puuid: string) {
  const out: { match: Match; p: MatchParticipant }[] = [];
  for (const match of matches) {
    const p = findParticipant(match, puuid);
    if (p) out.push({ match, p });
  }
  return out;
}

export interface UserChampReport {
  user: TrackedUser;
  totalGames: number;
  champs: ChampStat[];
  best?: ChampStat; // en yüksek winrate (min maç eşiği)
  worst?: ChampStat; // en düşük winrate (min maç eşiği)
}

export function userChampReport(
  user: TrackedUser,
  matches: Match[],
  minGames = 2
): UserChampReport {
  const parts = userParticipations(matches, user.puuid);
  const champs = aggregateChamps(parts).sort((a, b) => b.games - a.games);
  const eligible = champs.filter((c) => c.games >= minGames);
  const sortedByWr = [...eligible].sort(
    (a, b) => b.winRate - a.winRate || b.avgKda - a.avgKda
  );
  return {
    user,
    totalGames: parts.length,
    champs,
    best: sortedByWr[0],
    worst: sortedByWr[sortedByWr.length - 1],
  };
}

// ----------------- şampiyon bazlı tablo (hero -> kullanıcılar) -----------------

export interface ChampLeaderboardRow {
  championId: number;
  championName: string;
  entries: { user: TrackedUser; stat: ChampStat }[];
}

export function championLeaderboard(
  users: TrackedUser[],
  matches: Match[]
): ChampLeaderboardRow[] {
  const byChamp = new Map<string, ChampLeaderboardRow>();
  for (const user of users) {
    const parts = userParticipations(matches, user.puuid);
    for (const stat of aggregateChamps(parts)) {
      let row = byChamp.get(stat.championName);
      if (!row) {
        row = {
          championId: stat.championId,
          championName: stat.championName,
          entries: [],
        };
        byChamp.set(stat.championName, row);
      }
      row.entries.push({ user, stat });
    }
  }
  const rows = [...byChamp.values()];
  // Her şampiyonun altındaki kullanıcılar başarıya göre sıralanır.
  for (const row of rows) {
    row.entries.sort(
      (a, b) =>
        b.stat.winRate - a.stat.winRate ||
        b.stat.avgKda - a.stat.avgKda ||
        b.stat.games - a.stat.games
    );
  }
  // Şampiyonlar toplam oynanma sayısına göre sıralanır.
  rows.sort(
    (a, b) =>
      b.entries.reduce((s, e) => s + e.stat.games, 0) -
      a.entries.reduce((s, e) => s + e.stat.games, 0)
  );
  return rows;
}

// ----------------- en iyi / en kötü maçlar -----------------

export interface RatedMatch {
  match: Match;
  p: MatchParticipant;
  rating: number;
}

export function ratedMatchesForUser(
  matches: Match[],
  puuid: string
): RatedMatch[] {
  return userParticipations(matches, puuid)
    .map(({ match, p }) => ({ match, p, rating: performanceRating(match, p) }))
    .sort((a, b) => b.rating - a.rating);
}

// ----------------- kombinasyonlar (3'lü / 5'li) -----------------

export function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const combo: T[] = [];
  const rec = (start: number) => {
    if (combo.length === k) {
      res.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return res;
}

export interface ComboStat {
  members: TrackedUser[];
  games: number; // birlikte (aynı takımda) oynadıkları maç sayısı
  wins: number;
  winRate: number;
  matchIds: string[];
}

// Belirtilen boyuttaki tüm kombinasyonlar için, üyelerin AYNI takımda
// birlikte oynadığı maçları bulur.
export function comboStats(
  users: TrackedUser[],
  matches: Match[],
  size: number
): ComboStat[] {
  if (users.length < size) return [];
  const combos = combinations(users, size);
  const out: ComboStat[] = [];

  for (const members of combos) {
    let games = 0;
    let wins = 0;
    const matchIds: string[] = [];
    for (const match of matches) {
      const parts = members.map((m) => findParticipant(match, m.puuid));
      if (parts.some((p) => !p)) continue;
      const teamIds = new Set(parts.map((p) => p!.teamId));
      if (teamIds.size !== 1) continue; // hepsi aynı takımda değil
      games++;
      if (parts[0]!.win) wins++;
      matchIds.push(match.metadata.matchId);
    }
    if (games > 0) {
      out.push({
        members,
        games,
        wins,
        winRate: wins / games,
        matchIds,
      });
    }
  }
  // Önce maç sayısı, sonra winrate.
  out.sort((a, b) => b.games - a.games || b.winRate - a.winRate);
  return out;
}
