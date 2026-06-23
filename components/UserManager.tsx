"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers, usersStore } from "@/lib/usersStore";
import { getAccountByRiotId } from "@/lib/riotClient";
import { regionForPlatform } from "@/lib/regions";
import type { RiotAccount, TrackedUser } from "@/types/riot";
import { PLATFORMS } from "@/lib/regions";
import { useTranslation } from "@/lib/i18n";

interface PendingAdd {
  id: string;
  riotId: string;
  platform: string;
  status: "pending" | "error";
  errorMsg?: string;
}

export function UserManager() {
  const { t } = useTranslation();
  const users = useUsers();
  const qc = useQueryClient();
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState("euw1");
  const [pendingQueue, setPendingQueue] = useState<PendingAdd[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = riotId.trim();
    if (!id) return;

    // Reset input immediately so the user can add another player
    setRiotId("");

    // Quick client-side format validation
    const hashIdx = id.lastIndexOf("#");
    if (hashIdx < 1 || hashIdx === id.length - 1) {
      const errorItem: PendingAdd = {
        id: Math.random().toString(),
        riotId: id,
        platform,
        status: "error",
        errorMsg: t("userManager.invalidRiotId"),
      };
      setPendingQueue((prev) => [...prev, errorItem]);
      return;
    }

    const queueId = Math.random().toString();
    const pendingItem: PendingAdd = {
      id: queueId,
      riotId: id,
      platform,
      status: "pending",
    };

    setPendingQueue((prev) => [...prev, pendingItem]);

    try {
      const gameName = id.slice(0, hashIdx);
      const tagLine = id.slice(hashIdx + 1);
      const region = regionForPlatform(platform);

      // Call query client directly to bypass single-instance mutation locks
      const account = await qc.fetchQuery<RiotAccount>({
        queryKey: ["account", region, gameName.toLowerCase(), tagLine.toLowerCase()],
        queryFn: () => getAccountByRiotId(region, gameName, tagLine),
        staleTime: Infinity,
      });

      const newUser: TrackedUser = {
        riotId: `${account.gameName}#${account.tagLine}`,
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid: account.puuid,
        region,
        platform,
      };

      usersStore.add(newUser);

      // Remove from pending queue on success
      setPendingQueue((prev) => prev.filter((item) => item.id !== queueId));
    } catch (err) {
      // Mark as error in the queue
      setPendingQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? { ...item, status: "error", errorMsg: (err as Error).message }
            : item
        )
      );
    }
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
        <button type="submit">
          {t("userManager.add")}
        </button>
      </form>

      {(users.length > 0 || pendingQueue.length > 0) && (
        <div className="row" style={{ marginTop: 16, flexWrap: "wrap", gap: 8 }}>
          {/* Active resolved users */}
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

          {/* Pending and failed queue users */}
          {pendingQueue.map((item) => {
            const isError = item.status === "error";
            return (
              <div
                className={`user-chip ${isError ? "loss" : ""}`}
                key={item.id}
                style={{
                  border: isError ? "1px solid var(--loss)" : "1px dashed var(--accent)",
                  background: isError ? "rgba(251, 113, 133, 0.1)" : "rgba(56, 189, 248, 0.05)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {!isError && <span style={{ marginRight: 6, animation: "spin 2s linear infinite" }}>⏳</span>}
                <strong>{item.riotId}</strong>
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>
                  {item.platform.toUpperCase()}
                </span>
                {isError ? (
                  <>
                    <span className="loss" style={{ fontSize: 11, marginLeft: 8 }} title={item.errorMsg}>
                      ({t("common.errorPrefix")})
                    </span>
                    <button
                      className="danger"
                      onClick={() => setPendingQueue((prev) => prev.filter((q) => q.id !== item.id))}
                      title={t("userManager.remove")}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>
                    ({t("userManager.adding")})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
