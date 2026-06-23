"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Maç/hesap verileri pratikte değişmez. Aynı kullanıcı/maç için
            // tekrar istek atılmasın diye stale süresini çok uzun tutuyoruz.
            staleTime: 1000 * 60 * 60, // 1 saat
            gcTime: 1000 * 60 * 60 * 24, // 24 saat bellekte/diskte kalsın
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  const [persister] = useState(() =>
    typeof window === "undefined"
      ? undefined
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: "league-map-cache",
        })
  );

  // SSR sırasında persister yok; sadece istemcide kalıcılaştır.
  if (!persister) {
    return <>{children}</>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        // Dev API key'i 24 saatte expire olur; cache'i de 24 saatte tazele.
        maxAge: 1000 * 60 * 60 * 24,
        buster: "v1",
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
