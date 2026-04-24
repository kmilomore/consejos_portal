"use client";

import { AttendanceChart } from "@/components/portal/attendance-chart";
import { SectionCard } from "@/components/portal/section-card";
import { StatCard } from "@/components/portal/stat-card";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";

export default function MetricasPage() {
  const { snapshot, status } = usePortalSnapshot();
  const totalActas = snapshot.actas.length;
  const actasCompletas = snapshot.actas.filter((acta) => acta.modo_registro === "ACTA_COMPLETA").length;
  const registrosDocumentales = totalActas - actasCompletas;
  const porcentajeCompletas = totalActas === 0 ? 0 : Math.round((actasCompletas / totalActas) * 100);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-20 rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
          <div className="skeleton-shimmer h-40 rounded-[28px]" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">Análisis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Métricas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores de participación y sesiones del establecimiento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Actas completas"
          value={String(actasCompletas)}
          detail="Sesiones con formulario estructurado completo, acuerdos y asistencia registrada."
        />
        <StatCard
          label="Registros documentales"
          value={String(registrosDocumentales)}
          detail="Sesiones iniciadas con respaldo documental y metadatos mínimos para sostener el correlativo operativo."
        />
        <StatCard
          label="Cobertura completa"
          value={`${porcentajeCompletas}%`}
          detail={`De ${totalActas} sesione${totalActas === 1 ? "" : "s"} registradas, ${actasCompletas} ya están completamente sistematizadas.`}
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
          title="Distribución por agrupación"
          description="Sesiones agrupadas por división territorial de programación."
        >
          <div className="space-y-4">
            {snapshot.planningByComuna.length === 0 ? (
              <p className="text-sm text-slate-400">Sin sesiones registradas aún.</p>
            ) : (
              snapshot.planningByComuna.map((item) => (
                <div key={item.comuna} className="rounded-2xl bg-mist px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{item.comuna}</p>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-ocean">{item.total}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">sesiones</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
