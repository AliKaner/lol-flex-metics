"use client";

import { useState } from "react";
import { useUsers, usersStore } from "@/lib/usersStore";
import { useAddUser } from "@/hooks/useAddUser";
import { PLATFORMS } from "@/lib/regions";
import { useTranslation } from "@/lib/i18n";

export function UserManager() {
  const { t } = useTranslation();
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
      <h2>{t("userManager.title")}</h2>
      <p className="muted" style={{ marginTop: -8 }}>
        {t("userManager.subtitle")}
      </p>

      <form className="row" onSubmit={submit}>
        <input
          style={{ flex: "1 1 240px" }}
          placeholder={t("userManager.placeholder")}
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
          {addUser.isPending ? t("userManager.adding") : t("userManager.add")}
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
                title={t("userManager.remove")}
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
