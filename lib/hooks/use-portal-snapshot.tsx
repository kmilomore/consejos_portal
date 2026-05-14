"use client";

import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { usePortalAuth } from "@/lib/auth/context";
import { STORAGE_KEYS } from "@/lib/constants";
import { fetchPortalSnapshot, readPortalSnapshotVersion, type PortalSnapshot } from "@/lib/supabase/queries";

interface PortalSnapshotState {
  snapshot: PortalSnapshot;
  status: "loading" | "ready";
  refresh: () => void;
}

const EMPTY_SNAPSHOT: PortalSnapshot = {
  establishments: [],
  programaciones: [],
  actas: [],
  attendanceByRole: [],
  planningByComuna: [],
  actasByMode: { completas: 0, documentales: 0 },
  source: "mock",
  diagnostics: [],
};

type SnapshotCacheEntry = {
  snapshot: PortalSnapshot;
  version: number;
};

const snapshotCache = new Map<string, SnapshotCacheEntry>();
const snapshotRequests = new Map<string, Promise<PortalSnapshot>>();

function readStoredSnapshot(cacheKey: string): SnapshotCacheEntry | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.SNAPSHOT(cacheKey));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { snapshot?: PortalSnapshot; version?: number };
    if (!parsed.snapshot) {
      return null;
    }

    return {
      snapshot: parsed.snapshot,
      version: typeof parsed.version === "number" ? parsed.version : -1,
    };
  } catch {
    return null;
  }
}

function writeStoredSnapshot(cacheKey: string, entry: SnapshotCacheEntry) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEYS.SNAPSHOT(cacheKey), JSON.stringify(entry));
  } catch {
    // Ignore storage failures and keep the in-memory cache.
  }
}

const PortalSnapshotContext = createContext<PortalSnapshotState>({
  snapshot: EMPTY_SNAPSHOT,
  status: "loading",
  refresh: () => {},
});

export function PortalSnapshotProvider({ children }: PropsWithChildren): React.ReactElement {
  const { session, selectedRbd } = usePortalAuth();
  const userId = session?.user?.id ?? null;
  const snapshotCacheKey = `${userId ?? "anon"}:${selectedRbd ?? "all"}`;
  const [refreshKey, setRefreshKey] = useState(0);
  const [snapshot, setSnapshot] = useState<PortalSnapshot>(() => {
    const cachedEntry = snapshotCache.get(snapshotCacheKey) ?? readStoredSnapshot(snapshotCacheKey);
    if (cachedEntry) {
      snapshotCache.set(snapshotCacheKey, cachedEntry);
      return cachedEntry.snapshot;
    }

    return EMPTY_SNAPSHOT;
  });
  const [status, setStatus] = useState<"loading" | "ready">(() =>
    userId && !snapshotCache.has(snapshotCacheKey) && !readStoredSnapshot(snapshotCacheKey) ? "loading" : "ready",
  );

  useEffect(() => {
    let ignore = false;

    const currentVersion = readPortalSnapshotVersion();
    const cachedEntry = snapshotCache.get(snapshotCacheKey) ?? readStoredSnapshot(snapshotCacheKey);
    const cachedSnapshot = cachedEntry?.snapshot ?? null;
    const isStale = cachedEntry ? cachedEntry.version < currentVersion : false;

    if (!userId) {
      setSnapshot({ ...EMPTY_SNAPSHOT, source: "supabase" });
      setStatus("ready");
      return () => {
        ignore = true;
      };
    }

    if (cachedSnapshot) {
      snapshotCache.set(snapshotCacheKey, cachedEntry ?? { snapshot: cachedSnapshot, version: currentVersion });
      setSnapshot(cachedSnapshot);
      setStatus("ready");
      if (refreshKey === 0 && !isStale) {
        return () => {
          ignore = true;
        };
      }
    }

    if (!cachedSnapshot) {
      setStatus("loading");
    }

    async function loadSnapshot() {
      const request = snapshotRequests.get(snapshotCacheKey)
        ?? fetchPortalSnapshot(selectedRbd ?? undefined).finally(() => {
          snapshotRequests.delete(snapshotCacheKey);
        });

      snapshotRequests.set(snapshotCacheKey, request);

      const nextSnapshot = await request;
      if (!ignore) {
        const nextEntry = {
          snapshot: nextSnapshot,
          version: readPortalSnapshotVersion(),
        };
        snapshotCache.set(snapshotCacheKey, nextEntry);
        writeStoredSnapshot(snapshotCacheKey, nextEntry);
        setSnapshot(nextSnapshot);
        setStatus("ready");
      }
    }

    void loadSnapshot();

    return () => {
      ignore = true;
    };
  }, [refreshKey, selectedRbd, snapshotCacheKey, userId]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <PortalSnapshotContext.Provider value={{ snapshot, status, refresh }}>
      {children}
    </PortalSnapshotContext.Provider>
  );
}

export function usePortalSnapshot(): PortalSnapshotState {
  return useContext(PortalSnapshotContext);
}
