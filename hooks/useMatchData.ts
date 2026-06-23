"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Match, TrackedUser } from "@/types/riot";
import { getFlexMatchIds, getMatch } from "@/lib/riotClient";

export interface MatchData {
  matches: Match[]; // tekilleştirilmiş flex 5v5 maçları
  byId: Map<string, Match>;
  isLoading: boolean;
  loaded: number;
  total: number;
  error: string | null;
}

// Tüm takip edilen kullanıcılar için flex maç ID'lerini çeker, tekilleştirir,
// sonra her maçı bir kez indirir. Query'ler puuid/matchId ile cachelendiği için
// aynı kullanıcı/maç için tekrar istek atılmaz.
export function useMatchData(
  users: TrackedUser[],
  matchCount = 40,
  startTime?: number,
  endTime?: number
): MatchData {
  // 1) Her kullanıcının maç ID listesi
  const idQueries = useQueries({
    queries: users.map((u) => ({
      queryKey: ["matchIds", u.puuid, matchCount, startTime, endTime],
      queryFn: () => getFlexMatchIds(u.region, u.puuid, matchCount, startTime, endTime),
      enabled: !!u.puuid,
      staleTime: Infinity,
    })),
  });

  // 2) (matchId -> region) tekilleştir
  const uniqueMatches = useMemo(() => {
    const map = new Map<string, string>(); // matchId -> region
    users.forEach((u, i) => {
      const ids = idQueries[i]?.data;
      if (ids) for (const id of ids) if (!map.has(id)) map.set(id, u.region);
    });
    return [...map.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, idQueries.map((q) => q.dataUpdatedAt).join(",")]);

  // 3) Her maçı bir kez indir
  const matchQueries = useQueries({
    queries: uniqueMatches.map(([matchId, region]) => ({
      queryKey: ["match", matchId],
      queryFn: () => getMatch(region, matchId),
      staleTime: Infinity, // maçlar değişmez
    })),
  });

  return useMemo(() => {
    const idsLoading = idQueries.some((q) => q.isLoading);
    const matches: Match[] = [];
    const byId = new Map<string, Match>();
    let loaded = 0;
    for (const q of matchQueries) {
      if (q.data) {
        loaded++;
        matches.push(q.data);
        byId.set(q.data.metadata.matchId, q.data);
      }
    }
    const firstError =
      idQueries.find((q) => q.error)?.error ||
      matchQueries.find((q) => q.error)?.error;

    return {
      matches,
      byId,
      isLoading: idsLoading || matchQueries.some((q) => q.isLoading),
      loaded,
      total: uniqueMatches.length,
      error: firstError ? (firstError as Error).message : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    idQueries.map((q) => q.status).join(","),
    matchQueries.map((q) => q.status).join(","),
    uniqueMatches.length,
  ]);
}
