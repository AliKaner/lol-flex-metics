"use client";

import { useState } from "react";
import type { TrackedUser } from "@/types/riot";

const ROLES = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Slot {
  user: TrackedUser;
  role: string;
}

export function TeamBuilder({ users }: { users: TrackedUser[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(users.map((u) => u.puuid))
  );
  const [assignRoles, setAssignRoles] = useState(true);
  const [teams, setTeams] = useState<{ blue: Slot[]; red: Slot[] } | null>(null);

  const toggle = (puuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(puuid) ? next.delete(puuid) : next.add(puuid);
      return next;
    });
  };

  const generate = () => {
    const pool = shuffle(users.filter((u) => selected.has(u.puuid)));
    const mid = Math.ceil(pool.length / 2);
    const make = (list: TrackedUser[]): Slot[] =>
      list.map((user, i) => ({
        user,
        role: assignRoles ? ROLES[i % ROLES.length] : "",
      }));
    setTeams({ blue: make(pool.slice(0, mid)), red: make(pool.slice(mid)) });
  };

  if (users.length < 2)
    return <div className="empty">Takım kurmak için en az 2 oyuncu ekle.</div>;

  return (
    <div>
      <h2>Takım kurucu</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        Seçili oyuncuları rastgele iki takıma böler ve istersen rastgele rol atar.
      </p>

      <div className="row" style={{ marginBottom: 12 }}>
        {users.map((u) => (
          <label key={u.puuid} className="user-chip" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selected.has(u.puuid)}
              onChange={() => toggle(u.puuid)}
              style={{ width: 16 }}
            />
            {u.gameName}
          </label>
        ))}
      </div>

      <div className="row" style={{ marginBottom: 20 }}>
        <button onClick={generate} disabled={selected.size < 2}>
          🎲 Rastgele eşle
        </button>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={assignRoles}
            onChange={(e) => setAssignRoles(e.target.checked)}
            style={{ width: 16 }}
          />
          <span className="muted">Rol ata</span>
        </label>
      </div>

      {teams && (
        <div className="grid cols-2">
          {(["blue", "red"] as const).map((side) => (
            <div
              className="card"
              key={side}
              style={{
                borderTop: `3px solid ${side === "blue" ? "#3a8fd6" : "#f85149"}`,
              }}
            >
              <h3 style={{ color: side === "blue" ? "#3a8fd6" : "#f85149" }}>
                {side === "blue" ? "Mavi Takım" : "Kırmızı Takım"}
              </h3>
              {teams[side].map((s) => (
                <div className="stat-line" key={s.user.puuid} style={{ padding: "4px 0" }}>
                  <span>
                    {s.user.gameName}
                    <span className="muted"> #{s.user.tagLine}</span>
                  </span>
                  {s.role && <span className="badge">{s.role}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
