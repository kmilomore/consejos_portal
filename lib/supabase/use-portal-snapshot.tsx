"use client";

import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { fetchPortalSnapshot, type PortalSnapshot } from "@/lib/supabase/queries";

// ─── Shared context ────────────────────────────────────────────────────────────

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
  source: "mock",
  diagnostics: [],
};

const PortalSnapshotContext = createContext<PortalSnapshotState>({
  snapshot: EMPTY_SNAPSHOT,
  status: "loading",
  refresh: () => {},
});

// ─── Provider (mount once in AppFrame) ────────────────────────────────────────

export function PortalSnapshotProvider({ children }: PropsWithChildren): React.ReactElement {
  const { session, selectedRbd } = usePortalAuth();
  const userId = session?.user?.id ?? null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [snapshot, setSnapshot] = useState<PortalSnapshot>(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let ignore = false;

    if (!userId) {
      setSnapshot({ ...EMPTY_SNAPSHOT, source: "supabase" });
      setStatus("ready");
      return () => {
        ignore = true;
      };
    }

    setStatus("loading");

    async function loadSnapshot() {
      const nextSnapshot = await fetchPortalSnapshot(selectedRbd ?? undefined);
      if (!ignore) {
        setSnapshot(nextSnapshot);
        setStatus("ready");
      }
    }

    void loadSnapshot();

    return () => {
      ignore = true;
    };
  }, [userId, selectedRbd, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <PortalSnapshotContext.Provider value={{ snapshot, status, refresh }}>
      {children}
    </PortalSnapshotContext.Provider>
  );
}

// ─── Consumer hook (used by every page) ───────────────────────────────────────

export function usePortalSnapshot(): PortalSnapshotState {
  return useContext(PortalSnapshotContext);
}