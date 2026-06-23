import type { Match, RiotAccount, SummonerProfile } from "@/types/riot";
import { QUEUE_FLEX_5V5 } from "./regions";

// Tüm istekler kendi /api/riot proxy'mizden geçer (CORS + key gizliliği).
async function riotFetch<T>(host: string, path: string): Promise<T> {
  const res = await fetch(`/api/riot/${host}/${path}`);
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.status?.message || j?.error || "";
    } catch {
      /* yoksay */
    }
    throw new RiotError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export class RiotError extends Error {
  constructor(public status: number, public detail: string) {
    super(`Riot API hatası ${status}${detail ? `: ${detail}` : ""}`);
    this.name = "RiotError";
  }
}

export function getAccountByRiotId(
  region: string,
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  return riotFetch<RiotAccount>(
    region,
    `riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`
  );
}

export function getSummonerByPuuid(
  platform: string,
  puuid: string
): Promise<SummonerProfile> {
  return riotFetch<SummonerProfile>(
    platform,
    `lol/summoner/v4/summoners/by-puuid/${puuid}`
  );
}

export function getFlexMatchIds(
  region: string,
  puuid: string,
  count = 40
): Promise<string[]> {
  return riotFetch<string[]>(
    region,
    `lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${QUEUE_FLEX_5V5}&type=ranked&start=0&count=${count}`
  );
}

export function getMatch(region: string, matchId: string): Promise<Match> {
  return riotFetch<Match>(region, `lol/match/v5/matches/${matchId}`);
}
