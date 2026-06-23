"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TrackedUser } from "@/types/riot";
import { getFlexMatchIds, getMatch } from "@/lib/riotClient";
import { SEASONS } from "@/lib/seasons";

export function usePrefetchSeasons(
  users: TrackedUser[],
  activeSeasonId: string
) {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (users.length === 0) return;

    const otherSeasons = SEASONS.filter((s) => s.id !== activeSeasonId);

    let cancelled = false;

    async function prefetchSeason(seasonId: string, startTime: number, endTime?: number) {
      if (prefetchedRef.current.has(seasonId)) return;
      prefetchedRef.current.add(seasonId);

      for (const user of users) {
        if (cancelled) return;

        const queryKey = ["matchIds", user.puuid, 100, startTime, endTime];
        const existing = queryClient.getQueryData(queryKey);
        if (existing) continue;

        try {
          const ids = await getFlexMatchIds(user.region, user.puuid, 100, startTime, endTime);
          if (cancelled) return;
          queryClient.setQueryData(queryKey, ids);

          for (const matchId of ids.slice(0, 30)) {
            if (cancelled) return;
            const matchKey = ["match", matchId];
            if (queryClient.getQueryData(matchKey)) continue;

            try {
              const match = await getMatch(user.region, matchId);
              if (cancelled) return;
              queryClient.setQueryData(matchKey, match);
            } catch {
              // silently skip failed match fetches
            }
          }
        } catch {
          // silently skip failed season fetches
        }
      }
    }

    const timer = setTimeout(() => {
      (async () => {
        for (const season of otherSeasons) {
          if (cancelled) return;
          await prefetchSeason(season.id, season.startTime, season.endTime);
        }
      })();
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [users, activeSeasonId, queryClient]);
}
