"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AttendanceChart } from "@/components/portal/attendance-chart";
import { SectionCard } from "@/components/portal/section-card";
import { StatCard } from "@/components/portal/stat-card";
import { usePortalAuth } from "@/lib/auth/context";
import { hasTerritorialView } from "@/lib/auth/scope";
import { usePortalSnapshot } from "@/lib/hooks/use-portal-snapshot";
import { cn, formatDate, formatPercent } from "@/lib/utils";

type SessionMetricRow = {
  key: string;
  actaId: string | null;
  rbd: string;
  comuna: string;
  tipoSesion: "Ordinaria" | "Extraordinaria";
  numeroSesion: number;
  fechaReferencia: string;
  origen: "Acta" | "Programacion";
  estado: string;
};

function buildSessionMetricRows(
  actas: ReturnType<typeof usePortalSnapshot>["snapshot"]["actas"],
  programaciones: ReturnType<typeof usePortalSnapshot>["snapshot"]["programaciones"],
  establishments: ReturnType<typeof usePortalSnapshot>["snapshot"]["establishments"],
): SessionMetricRow[] {
  const comunaByRbd = new Map(establishments.map((item) => [item.rbd, item.comuna]));
  const rows = new Map<string, SessionMetricRow>();

  actas.forEach((acta) => {
    const key = `${acta.rbd}:${acta.tipo_sesion}:${acta.sesion}`;
    rows.set(key, {
      key,
      actaId: acta.id,
      rbd: acta.rbd,
      comuna: acta.comuna || comunaByRbd.get(acta.rbd) || "Sin comuna",
      tipoSesion: acta.tipo_sesion,
      numeroSesion: acta.sesion,
      fechaReferencia: acta.fecha,
      origen: "Acta",
      estado: acta.modo_registro === "REGISTRO_DOCUMENTAL" ? "Registro documental" : "Acta completa",
    });
  });

  programaciones.forEach((programacion) => {
    const key = `${programacion.rbd}:${programacion.tipo_sesion}:${programacion.numero_sesion}`;
    const current = rows.get(key);

    rows.set(key, {
      key,
      actaId: current?.actaId ?? programacion.acta_vinculada_id,
      rbd: programacion.rbd,
      comuna: comunaByRbd.get(programacion.rbd) || current?.comuna || "Sin comuna",
      tipoSesion: programacion.tipo_sesion,
      numeroSesion: programacion.numero_sesion,
      fechaReferencia: current?.fechaReferencia ?? programacion.fecha_programada,
      origen: current?.origen ?? "Programacion",
      estado: current?.estado ?? programacion.estado,
    });
  });

  return [...rows.values()].sort((left, right) => {
    return right.fechaReferencia.localeCompare(left.fechaReferencia)
      || left.rbd.localeCompare(right.rbd)
      || left.numeroSesion - right.numeroSesion;
  });
}

function formatRelativeTime(date: Date): string {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "ahora mismo";
  if (diffMinutes === 1) return "hace 1 minuto";
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  const diffHours = Math.floor(diffMinutes / 60);
  return diffHours === 1 ? "hace 1 hora" : `hace ${diffHours} horas`;
}

export default function MetricasPage() {
  const { isGlobalAdmin, isReadOnly, canSelectSchool, accessibleRbds } = usePortalAuth();
  const { snapshot, status } = usePortalSnapshot();
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number | null>(null);
  const [sessionTypeFilter, setSessionTypeFilter] = useState<"Todas" | "Ordinaria" | "Extraordinaria">("Todas");
  const [snapshotLoadedAt, setSnapshotLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (status === "ready") {
      setSnapshotLoadedAt(new Date());
    }
  }, [status]);
  const isTerritorialView = hasTerritorialView({ isGlobalAdmin, isReadOnly, canSelectSchool, accessibleRbds });
  const isDirectorView = !isTerritorialView;
  const isRepresentativeView = isTerritorialView && !isGlobalAdmin && !isReadOnly;
  const isCollaboratorView = isTerritorialView && isReadOnly;
  const sessionRows = buildSessionMetricRows(snapshot.actas, snapshot.programaciones, snapshot.establishments);
  const filteredSessionRows = sessionTypeFilter === "Todas"
    ? sessionRows
    : sessionRows.filter((row) => row.tipoSesion === sessionTypeFilter);
  const establishmentByRbd = new Map(snapshot.establishments.map((item) => [item.rbd, item]));
  const totalSesionesRealizadas = snapshot.actas.length;
  const sesionesOrdinariasRealizadas = snapshot.actas.filter((acta) => acta.tipo_sesion === "Ordinaria").length;
  const sesionesExtraordinariasRealizadas = totalSesionesRealizadas - sesionesOrdinariasRealizadas;
  const totalActas = snapshot.actas.length;
  const actasCompletas = snapshot.actas.filter((acta) => acta.modo_registro === "ACTA_COMPLETA").length;
  const registrosDocumentales = totalActas - actasCompletas;
  const establecimientosEnScope = Math.max(
    snapshot.establishments.length,
    new Set(sessionRows.map((session) => session.rbd)).size,
    1,
  );
  const metaSesionesOrdinarias = establecimientosEnScope * 4;
  const sesionesOrdinariasRegistradas = sesionesOrdinariasRealizadas;
  const cumplimientoNormativo = metaSesionesOrdinarias === 0
    ? 0
    : Math.min(sesionesOrdinariasRegistradas / metaSesionesOrdinarias, 1);
  const porcentajeCompletas = totalActas === 0 ? 0 : Math.round((actasCompletas / totalActas) * 100);
  const metricasDescription = isDirectorView
    ? "Indicadores de tu establecimiento, con foco en el cumplimiento normativo anual de las 4 sesiones ordinarias."
    : isCollaboratorView
      ? "Indicadores globales de solo lectura sobre sesiones realizadas, avance normativo y distribución territorial del año en curso."
    : isRepresentativeView
      ? "Indicadores consolidados de tus establecimientos asignados, incluyendo avance normativo y paneles asociados a su cobertura."
      : "Indicadores globales de sesiones realizadas, avance normativo y distribución territorial del año en curso.";
  const sesionesRealizadasDetail = isDirectorView
    ? `Corresponde a ${totalActas} acta${totalActas === 1 ? "" : "s"} registradas por tu establecimiento durante el año.`
    : isCollaboratorView
      ? `Corresponde a ${totalActas} acta${totalActas === 1 ? "" : "s"} registradas durante el año dentro de todo el portal en modo solo lectura.`
    : isRepresentativeView
      ? `Corresponde a ${totalActas} acta${totalActas === 1 ? "" : "s"} registradas durante el año dentro de tus escuelas asignadas.`
      : `Corresponde a ${totalActas} acta${totalActas === 1 ? "" : "s"} registradas durante el año dentro del alcance actual.`;
  const sesionesOrdinariasDetail = isDirectorView
    ? "Meta normativa anual: 4 sesiones ordinarias para tu establecimiento."
    : `Meta normativa anual: ${metaSesionesOrdinarias} sesiones ordinarias para ${establecimientosEnScope} establecimiento${establecimientosEnScope === 1 ? "" : "s"}.`;
  const avanceDescription = isDirectorView
    ? "Cada bloque muestra si tu establecimiento ya cerró cada una de las 4 sesiones ordinarias exigidas por la normativa anual."
    : "Cada bloque muestra cuántos establecimientos ya cerraron esa sesión ordinaria, cuánto falta para completar la meta anual y permite revisar las escuelas pendientes al hacer click.";
  const faltantesLabel = isDirectorView ? "sesión ordinaria" : "establecimiento";
  const sesionesOrdinariasPorNumero = [1, 2, 3, 4].map((numeroSesion) => {
    const rbdsCumplidos = new Set(
      snapshot.actas
        .filter((acta) => acta.tipo_sesion === "Ordinaria" && acta.sesion === numeroSesion)
        .map((acta) => acta.rbd),
    );
    const total = snapshot.actas.filter(
      (acta) => acta.tipo_sesion === "Ordinaria" && acta.sesion === numeroSesion,
    ).length;
    const porcentaje = establecimientosEnScope === 0 ? 0 : Math.min(total / establecimientosEnScope, 1);
    const escuelasFaltantes = snapshot.establishments
      .filter((item) => !rbdsCumplidos.has(item.rbd))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));

    return {
      numeroSesion,
      total,
      porcentaje,
      faltantes: Math.max(establecimientosEnScope - total, 0),
      escuelasFaltantes,
    };
  });
  const selectedSession = sesionesOrdinariasPorNumero.find((item) => item.numeroSesion === selectedSessionNumber) ?? null;
  const sesionesPorComuna = [...snapshot.actas.reduce((acc, acta) => {
    const comuna = acta.comuna || establishmentByRbd.get(acta.rbd)?.comuna || "Sin comuna";
    const current = acc.get(comuna) ?? { comuna, ordinarias: 0, extraordinarias: 0, total: 0, porcentaje: 0 };

    current.total += 1;
    if (acta.tipo_sesion === "Ordinaria") {
      current.ordinarias += 1;
    } else {
      current.extraordinarias += 1;
    }

    acc.set(comuna, current);
    return acc;
  }, new Map<string, { comuna: string; ordinarias: number; extraordinarias: number; total: number; porcentaje: number }>()).values()]
    .map((item) => ({
      ...item,
      porcentaje: totalSesionesRealizadas === 0 ? 0 : item.total / totalSesionesRealizadas,
    }))
    .sort((left, right) => right.total - left.total || left.comuna.localeCompare(right.comuna));
  const topEscuelas = [...snapshot.actas.reduce((acc, acta) => {
    const establecimiento = establishmentByRbd.get(acta.rbd);
    const current = acc.get(acta.rbd) ?? {
      rbd: acta.rbd,
      nombre: establecimiento?.nombre || `Establecimiento ${acta.rbd}`,
      comuna: acta.comuna || establecimiento?.comuna || "Sin comuna",
      ordinarias: 0,
      extraordinarias: 0,
      total: 0,
    };

    current.total += 1;
    if (acta.tipo_sesion === "Ordinaria") {
      current.ordinarias += 1;
    } else {
      current.extraordinarias += 1;
    }

    acc.set(acta.rbd, current);
    return acc;
  }, new Map<string, { rbd: string; nombre: string; comuna: string; ordinarias: number; extraordinarias: number; total: number }>()).values()]
    .sort((left, right) => right.total - left.total || left.nombre.localeCompare(right.nombre))
    .slice(0, 3);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-20 rounded-modal" />
        <div className="grid gap-4">
          <div className="skeleton-shimmer h-40 rounded-modal" />
          <div className="skeleton-shimmer h-40 rounded-modal" />
          <div className="skeleton-shimmer h-40 rounded-modal" />
          <div className="skeleton-shimmer h-40 rounded-modal" />
        </div>
        <div className="space-y-6">
          <div className="skeleton-shimmer h-[320px] rounded-modal" />
          <div className="skeleton-shimmer h-[320px] rounded-modal" />
        </div>
        <div className="skeleton-shimmer h-[360px] rounded-modal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">Análisis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Métricas</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {metricasDescription}
        </p>
        {snapshotLoadedAt ? (
          <p className="mt-2 text-xs text-neutral-400">
            Datos actualizados {formatRelativeTime(snapshotLoadedAt)}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sesiones realizadas"
          value={String(totalSesionesRealizadas)}
          detail={sesionesRealizadasDetail}
        />
        <StatCard
          label="Sesiones ordinarias"
          value={String(sesionesOrdinariasRealizadas)}
          detail={sesionesOrdinariasDetail}
        />
        <StatCard
          label="Sesiones extraordinarias"
          value={String(sesionesExtraordinariasRealizadas)}
          detail={`Se registran ${registrosDocumentales} respaldo${registrosDocumentales === 1 ? "" : "s"} documental${registrosDocumentales === 1 ? "" : "es"} y ${actasCompletas} acta${actasCompletas === 1 ? "" : "s"} completas.`}
        />
        <StatCard
          label="Cumplimiento de ordinarias"
          value={formatPercent(cumplimientoNormativo)}
          detail={`${sesionesOrdinariasRegistradas} de ${metaSesionesOrdinarias} sesiones ordinarias requeridas por la normativa vigente.`}
        />
      </div>

      <div className="space-y-6">
        <SectionCard
          eyebrow="Participación"
          title="Asistencia por estamento"
          description="Ratio calculado sobre el total de actas del establecimiento autenticado."
        >
          <AttendanceChart data={snapshot.attendanceByRole} />
        </SectionCard>

        <SectionCard
          eyebrow="Cumplimiento"
          title="Avance de sesiones ordinarias 1 a 4"
          description={avanceDescription}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {sesionesOrdinariasPorNumero.map((item) => (
              <button
                key={item.numeroSesion}
                type="button"
                onClick={() => setSelectedSessionNumber((current) => current === item.numeroSesion ? null : item.numeroSesion)}
                className={cn(
                  "rounded-card bg-mist p-4 text-left transition duration-200 hover:-tranneutral-y-0.5 hover:bg-mist/80",
                  selectedSessionNumber === item.numeroSesion && "ring-2 ring-ocean/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Sesión {item.numeroSesion}</p>
                    <p className="mt-2 text-3xl font-semibold text-ink">{item.total}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-ocean">{formatPercent(item.porcentaje)}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">avance</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-ocean"
                    style={{ width: `${Math.max(item.porcentaje * 100, item.porcentaje > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-neutral-600">
                  Faltan {item.faltantes} {faltantesLabel}{item.faltantes === 1 ? "" : "es"} por cerrar esta sesión ordinaria.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
                  {selectedSessionNumber === item.numeroSesion ? "Ocultar pendientes" : isDirectorView ? "Ver detalle" : "Ver escuelas faltantes"}
                </p>
              </button>
            ))}
          </div>
          {selectedSession ? (
            <div className="mt-5 rounded-card border border-neutral-200 bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">
                    Escuelas pendientes
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    Sesión ordinaria {selectedSession.numeroSesion}
                  </h3>
                </div>
                <p className="text-sm text-neutral-600">
                  {isDirectorView
                    ? (selectedSession.escuelasFaltantes.length === 0
                        ? "Tu establecimiento ya registra esta sesión."
                        : "Tu establecimiento aún no registra esta sesión.")
                    : `${selectedSession.escuelasFaltantes.length} establecimiento${selectedSession.escuelasFaltantes.length === 1 ? "" : "s"} aún no registra${selectedSession.escuelasFaltantes.length === 1 ? "" : "n"} esta sesión.`}
                </p>
              </div>
              {selectedSession.escuelasFaltantes.length === 0 ? (
                <p className="mt-4 text-sm text-status-success">{isDirectorView ? "Tu establecimiento ya cumplió esta sesión ordinaria." : "Todos los establecimientos en alcance ya cumplieron esta sesión ordinaria."}</p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {selectedSession.escuelasFaltantes.map((item) => (
                    <div key={item.rbd} className="rounded-card bg-mist px-4 py-3">
                      <p className="font-semibold text-ink">{item.nombre}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                        {item.comuna} · RBD {item.rbd}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </SectionCard>
      </div>

      {isDirectorView ? null : (
        <div className="space-y-6">
          <SectionCard
            eyebrow="Territorio"
            title="Sesiones realizadas por comuna"
            description="Desglose total con separación entre sesiones ordinarias y extraordinarias registradas en actas."
            collapsible
          >
            {sesionesPorComuna.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-200 p-8 text-center">
                <p className="text-sm text-neutral-500">Sin sesiones registradas aún.</p>
                <Link
                  href="/actas"
                  className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                >
                  Registrar primera acta →
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-neutral-200">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Comuna</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Ordinarias</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Extraordinarias</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Total</th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 md:table-cell">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sesionesPorComuna.map((item) => (
                      <tr key={item.comuna} className="transition-colors hover:bg-mist/60">
                        <td className="px-4 py-3.5 font-semibold text-ink">{item.comuna}</td>
                        <td className="px-4 py-3.5 text-right text-neutral-600">{item.ordinarias}</td>
                        <td className="px-4 py-3.5 text-right text-neutral-600">{item.extraordinarias}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-ocean">{item.total}</td>
                        <td className="hidden px-4 py-3.5 text-right text-neutral-500 md:table-cell">{formatPercent(item.porcentaje)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Ranking"
            title="Top 3 escuelas con más sesiones"
            description="Se consideran las sesiones efectivamente realizadas y registradas durante el año."
            collapsible
          >
            <div className="space-y-4">
              {topEscuelas.length === 0 ? (
                <div className="rounded-card border border-dashed border-neutral-200 p-8 text-center">
                  <p className="text-sm text-neutral-500">Sin sesiones registradas aún.</p>
                  <Link
                    href="/actas"
                    className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                  >
                    Registrar primera acta →
                  </Link>
                </div>
              ) : (
                topEscuelas.map((item, index) => (
                  <div key={item.rbd} className="rounded-card bg-mist p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Top {index + 1}</p>
                        <p className="mt-1 font-semibold text-ink">{item.nombre}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          {item.comuna} · RBD {item.rbd}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-semibold text-ocean">{item.total}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">sesiones</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-neutral-600">
                      {item.ordinarias} ordinaria{item.ordinarias === 1 ? "" : "s"} y {item.extraordinarias} extraordinaria{item.extraordinarias === 1 ? "" : "s"}.
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard
        eyebrow="Trazabilidad"
        title="Detalle de sesiones y acceso al acta"
        description={`Cobertura documental actual: ${porcentajeCompletas}% de las actas registradas ya están completamente sistematizadas.`}
      >
        {sessionRows.length === 0 ? (
          <div className="rounded-card border border-dashed border-neutral-200 p-8 text-center">
            <p className="text-sm text-neutral-500">Sin sesiones registradas aún.</p>
            <Link
              href="/actas"
              className="mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
            >
              Registrar primera acta →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(["Todas", "Ordinaria", "Extraordinaria"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSessionTypeFilter(type)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                    sessionTypeFilter === type
                      ? "bg-ocean text-white"
                      : "text-neutral-500 ring-1 ring-neutral-200 hover:bg-mist",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            {filteredSessionRows.length === 0 ? (
              <p className="text-sm text-neutral-400">Sin sesiones del tipo seleccionado.</p>
            ) : (
          <div className="overflow-hidden rounded-card border border-neutral-200">
            <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Sesión</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Comuna</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 md:table-cell">Fecha</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:table-cell">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredSessionRows.map((session) => (
                  <tr key={session.key} className="transition-colors hover:bg-mist/60">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">
                        {session.tipoSesion} N° {String(session.numeroSesion).padStart(2, "0")}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-ocean">{session.rbd}</p>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600">{session.comuna}</td>
                    <td className="hidden px-4 py-3.5 text-neutral-500 md:table-cell">{formatDate(session.fechaReferencia)}</td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          session.origen === "Acta"
                            ? "bg-status-success-bg text-status-success"
                            : "bg-status-warning-bg text-status-warning",
                        )}
                      >
                        {session.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {session.actaId ? (
                        <Link
                          href={`/actas?acta=${session.actaId}`}
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                        >
                          Ver acta
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-neutral-400">Sin acta vinculada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
