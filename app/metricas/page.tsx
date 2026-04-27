"use client";

import Link from "next/link";
import { AttendanceChart } from "@/components/portal/attendance-chart";
import { SectionCard } from "@/components/portal/section-card";
import { StatCard } from "@/components/portal/stat-card";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";
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

export default function MetricasPage() {
  const { snapshot, status } = usePortalSnapshot();
  const sessionRows = buildSessionMetricRows(snapshot.actas, snapshot.programaciones, snapshot.establishments);
  const totalSesiones = sessionRows.length;
  const sesionesOrdinarias = sessionRows.filter((session) => session.tipoSesion === "Ordinaria").length;
  const sesionesExtraordinarias = totalSesiones - sesionesOrdinarias;
  const totalActas = snapshot.actas.length;
  const actasCompletas = snapshot.actas.filter((acta) => acta.modo_registro === "ACTA_COMPLETA").length;
  const registrosDocumentales = totalActas - actasCompletas;
  const establecimientosEnScope = Math.max(
    snapshot.establishments.length,
    new Set(sessionRows.map((session) => session.rbd)).size,
    1,
  );
  const metaSesionesOrdinarias = establecimientosEnScope * 4;
  const sesionesOrdinariasRegistradas = snapshot.actas.filter((acta) => acta.tipo_sesion === "Ordinaria").length;
  const cumplimientoNormativo = metaSesionesOrdinarias === 0
    ? 0
    : Math.min(sesionesOrdinariasRegistradas / metaSesionesOrdinarias, 1);
  const porcentajeCompletas = totalActas === 0 ? 0 : Math.round((actasCompletas / totalActas) * 100);
  const sesionesPorComuna = sessionRows.reduce<Array<{ comuna: string; total: number; porcentaje: number }>>((acc, session) => {
    const current = acc.find((item) => item.comuna === session.comuna);
    if (current) {
      current.total += 1;
      return acc;
    }

    acc.push({ comuna: session.comuna, total: 1, porcentaje: 0 });
    return acc;
  }, []).map((item) => ({
    ...item,
    porcentaje: totalSesiones === 0 ? 0 : item.total / totalSesiones,
  })).sort((left, right) => right.total - left.total || left.comuna.localeCompare(right.comuna));

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-20 rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
        </div>
        <div className="skeleton-shimmer h-[360px] rounded-[28px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">Análisis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Métricas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores de participación, cumplimiento normativo y trazabilidad de sesiones del establecimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total de sesiones"
          value={String(totalSesiones)}
          detail={`Incluye ${snapshot.programaciones.length} programacione${snapshot.programaciones.length === 1 ? "" : "s"} y ${totalActas} acta${totalActas === 1 ? "" : "s"} dentro del alcance actual.`}
        />
        <StatCard
          label="Sesiones ordinarias"
          value={String(sesionesOrdinarias)}
          detail={`Meta normativa: ${metaSesionesOrdinarias} sesiones ordinarias al año para ${establecimientosEnScope} establecimiento${establecimientosEnScope === 1 ? "" : "s"} en alcance.`}
        />
        <StatCard
          label="Sesiones extraordinarias"
          value={String(sesionesExtraordinarias)}
          detail={`Se registran ${registrosDocumentales} respaldo${registrosDocumentales === 1 ? "" : "s"} documental${registrosDocumentales === 1 ? "" : "es"} y ${actasCompletas} acta${actasCompletas === 1 ? "" : "s"} completas.`}
        />
        <StatCard
          label="Cumplimiento normativo"
          value={formatPercent(cumplimientoNormativo)}
          detail={`${sesionesOrdinariasRegistradas} de ${metaSesionesOrdinarias} sesiones ordinarias requeridas por la normativa vigente.`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          eyebrow="Participación"
          title="Asistencia por estamento"
          description="Ratio calculado sobre el total de actas del establecimiento autenticado."
        >
          <AttendanceChart data={snapshot.attendanceByRole} />
        </SectionCard>

        <SectionCard
          eyebrow="Territorio"
          title="Sesiones por comuna participante"
          description="Cada comuna muestra su peso relativo sobre el total de sesiones visibles en el alcance actual."
        >
          <div className="space-y-4">
            {sesionesPorComuna.length === 0 ? (
              <p className="text-sm text-slate-400">Sin sesiones registradas aún.</p>
            ) : (
              sesionesPorComuna.map((item) => (
                <div key={item.comuna} className="rounded-2xl bg-mist px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{item.comuna}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {formatPercent(item.porcentaje)} del total
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-ocean">{item.total}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">sesiones</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-ocean"
                      style={{ width: `${Math.max(item.porcentaje * 100, item.porcentaje > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Trazabilidad"
        title="Detalle de sesiones y acceso al acta"
        description={`Cobertura documental actual: ${porcentajeCompletas}% de las actas registradas ya están completamente sistematizadas.`}
      >
        {sessionRows.length === 0 ? (
          <p className="text-sm text-slate-400">Sin sesiones registradas aún.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sesión</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Comuna</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:table-cell">Fecha</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:table-cell">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionRows.map((session) => (
                  <tr key={session.key} className="transition-colors hover:bg-mist/60">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">
                        {session.tipoSesion} N° {String(session.numeroSesion).padStart(2, "0")}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-ocean">{session.rbd}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{session.comuna}</td>
                    <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">{formatDate(session.fechaReferencia)}</td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          session.origen === "Acta"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
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
                        <span className="text-xs font-medium text-slate-400">Sin acta vinculada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
