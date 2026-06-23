// Riot API yanıtlarının kullandığımız alt kümesi.

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerProfile {
  id: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface MatchParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championName: string;
  championId: number;
  teamId: number; // 100 = mavi, 200 = kırmızı
  teamPosition?: string; // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  champLevel: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  largestMultiKill: number;
}

export interface MatchInfo {
  gameId: number;
  gameCreation: number;
  gameDuration: number; // saniye
  gameMode: string;
  queueId: number;
  participants: MatchParticipant[];
}

export interface Match {
  metadata: {
    matchId: string;
    participants: string[]; // puuid listesi
  };
  info: MatchInfo;
}

// Uygulama içinde kullanıcıları temsil eden tip.
export interface TrackedUser {
  riotId: string; // "Name#TAG"
  gameName: string;
  tagLine: string;
  puuid: string;
  region: string; // bölge kümesi: europe/americas/asia
  platform: string; // euw1/na1...
}
