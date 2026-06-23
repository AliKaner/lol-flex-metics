"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountByRiotId } from "@/lib/riotClient";
import { regionForPlatform } from "@/lib/regions";
import { usersStore } from "@/lib/usersStore";
import type { RiotAccount, TrackedUser } from "@/types/riot";

// "Name#TAG" + platform -> puuid çözer ve store'a ekler.
// Account sorgusu cachelenir; aynı Riot ID için tekrar istek atılmaz.
export function useAddUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      riotId,
      platform,
    }: {
      riotId: string;
      platform: string;
    }): Promise<TrackedUser> => {
      const trimmed = riotId.trim();
      const hashIdx = trimmed.lastIndexOf("#");
      if (hashIdx < 1 || hashIdx === trimmed.length - 1) {
        throw new Error('Geçersiz Riot ID. Format: "İsim#TAG" (örn: Faker#KR1)');
      }
      const gameName = trimmed.slice(0, hashIdx);
      const tagLine = trimmed.slice(hashIdx + 1);
      const region = regionForPlatform(platform);

      const account = await qc.fetchQuery<RiotAccount>({
        queryKey: ["account", region, gameName.toLowerCase(), tagLine.toLowerCase()],
        queryFn: () => getAccountByRiotId(region, gameName, tagLine),
        staleTime: Infinity,
      });

      const user: TrackedUser = {
        riotId: `${account.gameName}#${account.tagLine}`,
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid: account.puuid,
        region,
        platform,
      };
      usersStore.add(user);
      return user;
    },
  });
}
