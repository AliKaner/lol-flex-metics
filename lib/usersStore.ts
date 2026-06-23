"use client";

import { useSyncExternalStore } from "react";
import type { TrackedUser } from "@/types/riot";

// Eklenen kullanıcı listesi için minimal kalıcı store (localStorage + abonelik).
// Query cache'ten ayrıdır: burada "kimleri takip ediyoruz" bilgisi durur.

const KEY = "league-map-users";
let users: TrackedUser[] = load();
const listeners = new Set<() => void>();

function load(): TrackedUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(users));
  }
  listeners.forEach((l) => l());
}

export const usersStore = {
  getAll: () => users,
  add(user: TrackedUser) {
    if (users.some((u) => u.puuid === user.puuid)) return;
    users = [...users, user];
    persist();
  },
  remove(puuid: string) {
    users = users.filter((u) => u.puuid !== puuid);
    persist();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const EMPTY: TrackedUser[] = [];

export function useUsers(): TrackedUser[] {
  return useSyncExternalStore(
    usersStore.subscribe,
    usersStore.getAll,
    () => EMPTY
  );
}
