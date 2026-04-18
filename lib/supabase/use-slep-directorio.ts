"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SlepEscuela } from "@/types/domain";

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
  const [data, setData] = useState<SlepEscuela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = createClient();
    if (!client) {
      setError("Cliente Supabase no disponible.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    client
      .rpc("get_slep_directorio")
      .then(({ data: rows, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
        } else {
          setData((rows as SlepEscuela[]) ?? []);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo<SlepMetrics>(() => {
    const total = data.length;
    const comunasSet = new Set<string>();
    const porComuna: Record<string, ComunaStats> = {};
    let rural = 0;
    let urbano = 0;
    let conRepresentante = 0;
    let conAsesor = 0;

    for (const e of data) {
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
  }, [data]);

  return { data, metrics, isLoading, error };
}
