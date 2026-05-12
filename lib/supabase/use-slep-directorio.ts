"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import type { Establishment, SlepEscuela } from "@/types/domain";

const slepDirectorioCache = new Map<string, SlepEscuela[]>();
const slepDirectorioErrorCache = new Map<string, string | null>();
const slepDirectorioRequests = new Map<string, Promise<{ data: SlepEscuela[] | null; error: string | null }>>();

function getSlepDirectorioStorageKey(userId: string) {
  return `consejos.slep-directorio.${userId}`;
}

function readStoredDirectorio(userId: string): SlepEscuela[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getSlepDirectorioStorageKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { data?: SlepEscuela[] };
    return Array.isArray(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeStoredDirectorio(userId: string, data: SlepEscuela[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getSlepDirectorioStorageKey(userId), JSON.stringify({ data }));
  } catch {
    // Ignore storage write failures and keep the in-memory cache.
  }
}

function mergeDirectorioWithEstablishments(directorio: SlepEscuela[], establishments: Establishment[]): SlepEscuela[] {
  const merged = new Map<string, SlepEscuela>();

  directorio.forEach((school) => {
    const rbd = school.rbd?.trim();
    if (!rbd) {
      return;
    }

    merged.set(rbd, school);
  });

  establishments.forEach((establishment) => {
    const current = merged.get(establishment.rbd);

    merged.set(establishment.rbd, {
      rbd: establishment.rbd,
      nombre_establecimiento: current?.nombre_establecimiento ?? establishment.nombre,
      comuna: current?.comuna ?? establishment.comuna,
      rural_urbano: current?.rural_urbano ?? null,
      tipo: current?.tipo ?? null,
      director: current?.director ?? null,
      representante_consejo: current?.representante_consejo ?? null,
      correo_representante: current?.correo_representante ?? null,
      asesor_uatp: current?.asesor_uatp ?? null,
      correo_asesor: current?.correo_asesor ?? null,
      correo_electronico: current?.correo_electronico ?? null,
      latitud: current?.latitud ?? null,
      longitud: current?.longitud ?? null,
    });
  });

  return [...merged.values()].sort((left, right) => {
    return (left.comuna ?? "").localeCompare(right.comuna ?? "")
      || (left.nombre_establecimiento ?? "").localeCompare(right.nombre_establecimiento ?? "")
      || (left.rbd ?? "").localeCompare(right.rbd ?? "");
  });
}

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
  const { accessibleRbds, isGlobalAdmin, session } = usePortalAuth();
  const userId = session?.user?.id ?? "anon";
  const [data, setData] = useState<SlepEscuela[]>(() => {
    const cached = slepDirectorioCache.get(userId) ?? readStoredDirectorio(userId);
    if (cached) {
      slepDirectorioCache.set(userId, cached);
      return cached;
    }

    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !slepDirectorioCache.has(userId) && !slepDirectorioErrorCache.has(userId));
  const [error, setError] = useState<string | null>(() => slepDirectorioErrorCache.get(userId) ?? null);

  useEffect(() => {
    const cached = slepDirectorioCache.get(userId) ?? readStoredDirectorio(userId);
    const cachedError = slepDirectorioErrorCache.get(userId) ?? null;

    if (cached || cachedError) {
      if (cached) {
        slepDirectorioCache.set(userId, cached);
        setData(cached);
        setIsLoading(false);
      }
      if (cachedError) {
        setError(cachedError);
        setIsLoading(false);
      }
      return;
    }

    const client = createClient();
    if (!client) {
      const nextError = "Cliente Supabase no disponible.";
      slepDirectorioErrorCache.set(userId, nextError);
      setError(nextError);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const request = slepDirectorioRequests.get(userId) ?? client
      .rpc("get_slep_directorio")
      .then(({ data: rows, error: rpcError }: { data: SlepEscuela[] | null; error: { message: string } | null }) => {
        return client
          .from("establecimientos")
          .select("rbd, nombre, direccion, comuna")
          .order("nombre", { ascending: true })
          .then(({ data: establishments, error: establishmentsError }: { data: Establishment[] | null; error: { message: string } | null }) => {
            const nextData = mergeDirectorioWithEstablishments((rows as SlepEscuela[]) ?? [], establishments ?? []);
            const nextError = rpcError?.message ?? establishmentsError?.message ?? null;

            return {
              data: nextError && nextData.length === 0 ? null : nextData,
              error: nextError && nextData.length === 0 ? nextError : null,
            };
          });
      })
      .finally(() => {
        slepDirectorioRequests.delete(userId);
      });

    slepDirectorioRequests.set(userId, request);

    request.then(({ data: rows, error: rpcError }: { data: SlepEscuela[] | null; error: string | null }) => {
        if (cancelled) return;
        if (rpcError) {
          slepDirectorioErrorCache.set(userId, rpcError);
          setError(rpcError);
        } else {
          const nextData = rows ?? [];
          slepDirectorioCache.set(userId, nextData);
          slepDirectorioErrorCache.delete(userId);
          writeStoredDirectorio(userId, nextData);
          setData(nextData);
          setError(null);
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
