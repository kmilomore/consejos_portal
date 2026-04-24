"use client";

import Link from "next/link";
import { ArrowRight, School2 } from "lucide-react";
import { AttendanceChart } from "@/components/portal/attendance-chart";
import { SectionCard } from "@/components/portal/section-card";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";
import { useSlepDirectorio } from "@/lib/supabase/use-slep-directorio";
import { cn } from "@/lib/utils";

export default function SummaryPage() {
  const { snapshot, status } = usePortalSnapshot();
  const { establishment, profile, selectedRbd } = usePortalAuth();
  const isAdmin = profile?.rol === "ADMIN";
  const { data: slepSchools } = useSlepDirectorio();

  const activeSchool = isAdmin ? (slepSchools.find((e) => e.rbd === selectedRbd) ?? null) : null;
  const schoolName = activeSchool?.nombre_establecimiento ?? establishment?.nombre ?? "Establecimiento";
  const rbd = activeSchool?.rbd ?? profile?.rbd;
  const comuna = activeSchool?.comuna ?? establishment?.comuna;

  if (isAdmin && !selectedRbd) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-ocean/10 text-ocean">
          <School2 className="h-7 w-7" />
        </div>
        <p className="text-lg font-semibold text-ink">Selecciona una escuela</p>
        <p className="max-w-xs text-sm text-slate-500">
          Elige un establecimiento desde el selector del panel lateral para ver su resumen.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/80 p-8 shadow-sm">
          <div className="space-y-4">
            <div className="skeleton-shimmer h-3 w-28 rounded-full" />
            <div className="skeleton-shimmer h-11 max-w-2xl rounded-2xl" />
            <div className="skeleton-shimmer h-5 w-56 rounded-full" />
            <div className="flex gap-3 pt-2">
              <div className="skeleton-shimmer h-10 w-36 rounded-full" />
              <div className="skeleton-shimmer h-10 w-24 rounded-full" />
            </div>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
          <div className="skeleton-shimmer h-[320px] rounded-[28px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="panel-reveal overflow-hidden rounded-[32px] bg-hero-grid p-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-ocean">Consejo Escolar</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink lg:text-5xl">{schoolName}</h1>
          {(rbd ?? comuna) && (
            <p className="text-sm text-slate-500">
              {rbd && <>RBD {rbd}</>}{rbd && comuna && <> · </>}{comuna}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/programacion"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition duration-200 hover:bg-slate-800",
              )}
            >
              Programación
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/actas"
              className={cn(
                "inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200 transition duration-200 hover:bg-slate-50",
              )}
            >
              Actas
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Asistencia"
          title="Nivel de participación por estamento"
          description="Calculado sobre todas las actas del establecimiento autenticado."
        >
          <AttendanceChart data={snapshot.attendanceByRole} />
        </SectionCard>

        <SectionCard
          eyebrow="Territorio"
          title="Sesiones por período"
          description="Distribución de programaciones según estado actual."
        >
          <div className="space-y-3">
            {snapshot.planningByComuna.length === 0 ? (
              <p className="text-sm text-slate-400">Sin sesiones registradas aún.</p>
            ) : (
              snapshot.planningByComuna.map((item) => (
                <div key={item.comuna} className="flex items-center justify-between rounded-2xl bg-mist px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
                  <p className="font-semibold text-ink">{item.comuna}</p>
                  <p className="text-2xl font-semibold text-ocean">{item.total}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
