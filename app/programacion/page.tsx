"use client";

import { SectionCard } from "@/components/portal/section-card";
import { DataBanner } from "@/components/portal/data-banner";
import { SessionTable } from "@/components/portal/session-table";
import { Button } from "@/components/ui/button";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";

const validationSteps = [
  "Validar que el establecimiento no supere 4 sesiones ordinarias en el mismo año.",
  "Obtener correlativo exacto considerando programación y actas ya realizadas.",
  "Mantener la sesión en estado PROGRAMADA hasta que exista un acta oficial vinculada.",
];

export default function ProgramacionPage() {
  const { snapshot, status } = usePortalSnapshot();
  const rows = snapshot.programaciones;

  return (
    <div className="space-y-6">
      <DataBanner source={snapshot.source} status={status} reason={snapshot.reason} diagnostics={snapshot.diagnostics} />

      <SectionCard
        eyebrow="Flujo 01"
        title="Programación de sesiones"
        description="Vista estática para directores. El siguiente paso natural es conectar formularios cliente contra un backend externo cuando definan la integración final."
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-sand p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Guardrails definidos desde el modelo</p>
            <p className="mt-1 text-sm text-slate-600">La función SQL get_next_session_number deja resuelta la numeración correlativa.</p>
          </div>
          <Button>Nueva programación</Button>
        </div>

        {rows.length > 0 ? (
          <SessionTable rows={rows} />
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            No hay programaciones visibles en este momento. Si ya existen en Supabase, revisa las políticas RLS y la sesión activa del frontend.
          </div>
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Validaciones"
        title="Reglas ya contempladas"
        description="Estas reglas quedaron modeladas tanto a nivel de arquitectura como en la migración inicial de Supabase."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {validationSteps.map((step, index) => (
            <article key={step} className="rounded-[24px] border border-slate-200/80 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ocean">Paso 0{index + 1}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{step}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}