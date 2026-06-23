"use client";

import { useState } from "react";
import { useUsers, usersStore } from "@/lib/usersStore";
import { useAddUser } from "@/hooks/useAddUser";
import { PLATFORMS } from "@/lib/regions";

export function UserManager() {
  const users = useUsers();
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState("euw1");
  const addUser = useAddUser();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riotId.trim()) return;
    addUser.mutate(
      { riotId, platform },
      { onSuccess: () => setRiotId("") }
    );
  };

  return (
    <div className="panel">
      <h2>Oyuncular</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        İstediğin kadar oyuncu ekle. Veriler tarayıcıda saklanır, aynı oyuncu
        için tekrar tekrar istek atılmaz.
      </p>

      <form className="row" onSubmit={submit}>
        <input
          style={{ flex: "1 1 240px" }}
          placeholder="Riot ID — örn: Faker#KR1"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={addUser.isPending}>
          {addUser.isPending ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>

      {addUser.isError && (
        <p className="loss" style={{ marginTop: 10 }}>
          {(addUser.error as Error).message}
        </p>
      )}

      {users.length > 0 && (
        <div className="row" style={{ marginTop: 16 }}>
          {users.map((u) => (
            <div className="user-chip" key={u.puuid}>
              <strong>{u.gameName}</strong>
              <span className="muted">#{u.tagLine}</span>
              <span className="muted" style={{ fontSize: 11 }}>
                {u.platform.toUpperCase()}
              </span>
              <button
                className="danger"
                onClick={() => usersStore.remove(u.puuid)}
                title="Kaldır"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
