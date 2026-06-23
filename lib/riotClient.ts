import type { Match, RiotAccount, SummonerProfile } from "@/types/riot";
import { QUEUE_FLEX_5V5 } from "./regions";

// Tüm istekler kendi /api/riot proxy'mizden geçer (CORS + key gizliliği).
async function riotFetch<T>(host: string, path: string): Promise<T> {
  let retries = 0;
  const maxRetries = 100; // Gerekirse yarım saatten fazla (yaklaşık 1 saat) bekleyip denemeye devam eder

  while (true) {
    const res = await fetch(`/api/riot/${host}/${path}`);
    if (res.ok) {
      return res.json() as Promise<T>;
    }

    // 429 (Rate Limit) veya geçici sunucu hataları (500, 502, 503, 504)
    if (res.status === 429 || (res.status >= 500 && res.status <= 504)) {
      retries++;
      if (retries > maxRetries) {
        throw new RiotError(res.status, `Maksimum deneme sayısı aşıldı: ${res.status}`);
      }

      // Retry-After header'ı varsa saniye cinsindendir
      const retryAfterStr = res.headers.get("retry-after");
      let delayMs = 2000;

      if (retryAfterStr) {
        const seconds = parseInt(retryAfterStr, 10);
        if (!isNaN(seconds)) {
          delayMs = seconds * 1000;
        }
      } else {
        if (res.status === 429) {
          // 429'da her denemede bekleme süresini artırarak (exponential-ish backoff) bekleyelim.
          // max 45 saniye. Böylece 2 dakikalık limitleri aşarız.
          delayMs = Math.min(1000 * 8 * retries, 1000 * 45);
        } else {
          delayMs = 1000 * 3 * retries; // Sunucu hataları için 3, 6, 9... saniye
        }
      }

      console.warn(`Riot API rate limit veya geçici sunucu hatası (${res.status}). ${delayMs / 1000} saniye bekleniyor (Deneme: ${retries}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    let detail = "";
    try {
      const j = await res.json();
      detail = j?.status?.message || j?.error || "";
    } catch {
      /* yoksay */
    }
    throw new RiotError(res.status, detail);
  }
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

let activeRequests = 0;
const queue: (() => void)[] = [];

function next() {
  if (activeRequests < 6 && queue.length > 0) {
    activeRequests++;
    const run = queue.shift()!;
    run();
  }
}

async function queuedFetch<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(async () => {
      // Eğer kuyruk çok birikirse rate-limit (429) yememek için aralara küçük bekleme koyalım
      if (queue.length > 10) {
        await new Promise((r) => setTimeout(r, 60));
      }
      try {
        const res = await fn();
        resolve(res);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        next();
      }
    });
    next();
  });
}

export async function getFlexMatchIds(
  region: string,
  puuid: string,
  count = 100, // Bu parametre artık geriye dönük uyumluluk için var, döngüyle tümünü çekeceğiz
  startTime?: number
): Promise<string[]> {
  let allIds: string[] = [];
  let start = 0;
  const batchSize = 100;

  while (true) {
    let url = `lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${QUEUE_FLEX_5V5}&type=ranked&start=${start}&count=${batchSize}`;
    if (startTime) {
      url += `&startTime=${startTime}`;
    }

    const ids = await riotFetch<string[]>(region, url);
    allIds = allIds.concat(ids);

    if (ids.length < batchSize) {
      break;
    }

    start += batchSize;

    // Emniyet sınırı: Tarayıcıyı ve API limitlerini korumak için max 1000 maç ID'si alıyoruz
    if (start >= 1000) {
      break;
    }
  }

  return allIds;
}

export function getMatch(region: string, matchId: string): Promise<Match> {
  return queuedFetch(() => riotFetch<Match>(region, `lol/match/v5/matches/${matchId}`));
}
