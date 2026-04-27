"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import type { SlepEscuela } from "@/types/domain";

let slepDirectorioCache: SlepEscuela[] | null = null;
let slepDirectorioErrorCache: string | null = null;

export interface ComunaStats {
  total: number;
  rural: number;
  urbano: number;
  escuelas: SlepEscuela[];
}

export interface SlepMetrics {
  total: number;
  comunas: string[];
  porComuna: Record<string, ComunaStats>;
  rural: number;
  urbano: number;
  conRepresentante: number;
  conAsesor: number;
}

export function useSlepDirectorio() {
  const { accessibleRbds, isGlobalAdmin } = usePortalAuth();
  const [data, setData] = useState<SlepEscuela[]>(() => slepDirectorioCache ?? []);
  const [isLoading, setIsLoading] = useState(() => slepDirectorioCache === null && slepDirectorioErrorCache === null);
  const [error, setError] = useState<string | null>(() => slepDirectorioErrorCache);

  useEffect(() => {
    if (slepDirectorioCache || slepDirectorioErrorCache) {
      return;
    }

    const client = createClient();
    if (!client) {
      const nextError = "Cliente Supabase no disponible.";
      slepDirectorioErrorCache = nextError;
      setError(nextError);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    client
      .rpc("get_slep_directorio")
      .then(({ data: rows, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          slepDirectorioErrorCache = rpcError.message;
          setError(rpcError.message);
        } else {
          const nextData = (rows as SlepEscuela[]) ?? [];
          slepDirectorioCache = nextData;
          setData(nextData);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleData = useMemo(() => {
    if (isGlobalAdmin) {
      return data;
    }

    if (accessibleRbds.length === 0) {
      return [];
    }

    const allowedRbds = new Set(accessibleRbds);
    return data.filter((school) => school.rbd != null && allowedRbds.has(school.rbd));
  }, [accessibleRbds, data, isGlobalAdmin]);

  const metrics = useMemo<SlepMetrics>(() => {
    const total = visibleData.length;
    const comunasSet = new Set<string>();
    const porComuna: Record<string, ComunaStats> = {};
    let rural = 0;
    let urbano = 0;
    let conRepresentante = 0;
    let conAsesor = 0;

    for (const e of visibleData) {
      const c = e.comuna ?? "Sin comuna";
      comunasSet.add(c);

      if (!porComuna[c]) {
        porComuna[c] = { total: 0, rural: 0, urbano: 0, escuelas: [] };
      }

      porComuna[c].total++;
      porComuna[c].escuelas.push(e);

      const rv = e.rural_urbano?.trim().toUpperCase();
      if (rv === "RURAL") {
        rural++;
        porComuna[c].rural++;
      } else {
        urbano++;
        porComuna[c].urbano++;
      }

      if (e.representante_consejo) conRepresentante++;
      if (e.asesor_uatp) conAsesor++;
    }

    const comunas = [...comunasSet].sort();
    return { total, comunas, porComuna, rural, urbano, conRepresentante, conAsesor };
  }, [visibleData]);

  return { data: visibleData, metrics, isLoading, error };
}
