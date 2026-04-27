"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin, Search, TreePine, Users } from "lucide-react";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { useSlepDirectorio } from "@/lib/supabase/use-slep-directorio";
import type { SlepEscuela } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ocean/10 text-ocean">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Territory bar ─────────────────────────────────────────────────────────
function TerritoryBar({ label, total, rural, urbano, max }: { label: string; total: number; rural: number; urbano: number; max: number }) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  return (
    <div className="group rounded-[20px] border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-200 hover:shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{label}</p>
        <div className="flex shrink-0 items-center gap-3">
          {rural > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {rural} rural
            </span>
          )}
          {urbano > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
              {urbano} urbano
            </span>
          )}
          <span className="w-8 text-right text-sm font-black text-ink">{total}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-ocean transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Directory row ─────────────────────────────────────────────────────────
function DirectoryRow({ e }: { e: SlepEscuela }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
      <td className="whitespace-nowrap py-3 pr-4 pl-4 text-xs font-bold text-slate-500 lg:pl-6">{e.rbd ?? "—"}</td>
      <td className="max-w-[220px] py-3 pr-4">
        <p className="truncate text-sm font-semibold text-ink">{e.nombre_establecimiento ?? "Sin nombre"}</p>
        {e.tipo && <p className="text-[11px] text-slate-400">{e.tipo}</p>}
      </td>
      <td className="whitespace-nowrap py-3 pr-4 text-sm text-slate-600">{e.comuna ?? "—"}</td>
      <td className="py-3 pr-4">
        {e.rural_urbano ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            e.rural_urbano.toUpperCase() === "RURAL"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700"
          }`}>
            {e.rural_urbano}
          </span>
        ) : <span className="text-slate-300">—</span>}
      </td>
      <td className="max-w-[160px] py-3 pr-4">
        <p className="truncate text-sm text-slate-700">{e.director ?? "—"}</p>
      </td>
      <td className="max-w-[160px] py-3 pr-4">
        {e.representante_consejo ? (
          <div>
            <p className="truncate text-sm text-slate-700">{e.representante_consejo}</p>
            {e.correo_representante && (
              <p className="truncate text-[11px] text-slate-400">{e.correo_representante}</p>
            )}
          </div>
        ) : <span className="text-[11px] text-rose-400 font-semibold">Sin representante</span>}
      </td>
      <td className="max-w-[160px] py-3 pr-4 lg:pr-6">
        {e.asesor_uatp ? (
          <div>
            <p className="truncate text-sm text-slate-700">{e.asesor_uatp}</p>
            {e.correo_asesor && (
              <p className="truncate text-[11px] text-slate-400">{e.correo_asesor}</p>
            )}
          </div>
        ) : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { profile, isGlobalAdmin, accessibleRbds } = usePortalAuth();
  const router = useRouter();
  const { data, metrics, isLoading, error } = useSlepDirectorio();
  const [query, setQuery] = useState("");
  const [comunaFilter, setComunaFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");

  // Guard: non-admins get redirected
  useEffect(() => {
    if (profile && profile.rol !== "ADMIN") {
      router.replace("/resumen");
    }
  }, [profile, router]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.filter((e) => {
      const matchesQuery =
        !q ||
        e.nombre_establecimiento?.toLowerCase().includes(q) ||
        e.rbd?.toLowerCase().includes(q) ||
        e.director?.toLowerCase().includes(q) ||
        e.representante_consejo?.toLowerCase().includes(q);
      const matchesComuna = !comunaFilter || e.comuna === comunaFilter;
      const matchesTerritory =
        !territoryFilter ||
        e.rural_urbano?.toUpperCase() === territoryFilter.toUpperCase();
      return matchesQuery && matchesComuna && matchesTerritory;
    });
  }, [data, query, comunaFilter, territoryFilter]);

  const maxPerComuna = useMemo(
    () => Math.max(...Object.values(metrics.porComuna).map((c) => c.total), 1),
    [metrics.porComuna],
  );

  const pctRepresentante =
    metrics.total > 0 ? Math.round((metrics.conRepresentante / metrics.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="skeleton-shimmer h-32 rounded-[24px]" />
          <div className="skeleton-shimmer h-32 rounded-[24px]" />
          <div className="skeleton-shimmer h-32 rounded-[24px]" />
          <div className="skeleton-shimmer h-32 rounded-[24px]" />
        </div>
        <div className="skeleton-shimmer h-[240px] rounded-[28px]" />
        <div className="skeleton-shimmer h-[420px] rounded-[28px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-semibold text-rose-700">Error al cargar el directorio</p>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">
          SLEP Colchagua
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {isGlobalAdmin ? "Panel Administrador" : "Panel de territorio asignado"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isGlobalAdmin
            ? "Directorio de establecimientos educacionales y métricas por territorio."
            : "Vista agregada únicamente de las escuelas y comunas asociadas al correo autenticado."}
        </p>
      </div>

      {!isGlobalAdmin && (
        <div className="rounded-[24px] border border-ocean/15 bg-ocean/5 px-5 py-4 text-sm text-slate-700">
          Este panel no entrega acceso global. Las metricas, territorios y escuelas mostradas corresponden solo a tu cobertura asignada. Hoy tienes {accessibleRbds.length} escuela{accessibleRbds.length === 1 ? "" : "s"} dentro de alcance. Los directores no entran aqui: ellos aterrizan en /resumen y ven solo su establecimiento.
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-2">
        <KpiCard
          label="Establecimientos"
          value={metrics.total}
          sub="en base SLEP"
          icon={Building2}
        />
        <KpiCard
          label="Comunas"
          value={metrics.comunas.length}
          sub="con establecimientos"
          icon={MapPin}
        />
        <KpiCard
          label="Urbano / Rural"
          value={`${metrics.urbano} / ${metrics.rural}`}
          sub={`${metrics.rural > 0 ? Math.round((metrics.rural / metrics.total) * 100) : 0}% rurales`}
          icon={TreePine}
        />
        <KpiCard
          label="Con representante CE"
          value={`${pctRepresentante}%`}
          sub={`${metrics.conRepresentante} de ${metrics.total}`}
          icon={Users}
        />
      </div>

      {/* By territory */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white/78 p-6 shadow-panel backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
          Distribución territorial
        </p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Por comuna</h2>
        <div className="mt-5 space-y-2">
          {metrics.comunas.map((c) => {
            const cs = metrics.porComuna[c];
            return (
              <TerritoryBar
                key={c}
                label={c}
                total={cs.total}
                rural={cs.rural}
                urbano={cs.urbano}
                max={maxPerComuna}
              />
            );
          })}
        </div>
      </div>

      {/* Full directory */}
      <div className="rounded-[28px] border border-slate-200/80 bg-white/78 shadow-panel backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
              {isGlobalAdmin ? "Directorio completo" : "Directorio asignado"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {filtered.length} de {metrics.total} establecimientos
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nombre, RBD, director…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
              />
            </div>
            {/* Comuna filter */}
            <select
              value={comunaFilter}
              onChange={(e) => setComunaFilter(e.target.value)}
              className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean"
            >
              <option value="">Todas las comunas</option>
              {metrics.comunas.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {/* Territory filter */}
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean"
            >
              <option value="">Rural y urbano</option>
              <option value="URBANO">Urbano</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>
        </div>

        <div className="max-h-[66vh] overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/85">
                <th className="sticky top-0 py-3 pl-4 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 lg:pl-6">RBD</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Nombre</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Comuna</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Territorio</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Director/a</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Representante CE</th>
                <th className="sticky top-0 py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 lg:pr-6">Asesor UATP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron establecimientos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((e, i) => <DirectoryRow key={e.rbd ?? i} e={e} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
