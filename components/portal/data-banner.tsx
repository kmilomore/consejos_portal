import { cn } from "@/lib/utils";
import type { PortalDataSource, PortalDiagnostic } from "@/lib/supabase/queries";

interface DataBannerProps {
  source: PortalDataSource;
  status: "loading" | "ready";
  reason?: string;
  diagnostics?: PortalDiagnostic[];
}

const diagnosticTone = {
  ok: "text-emerald-900",
  empty: "text-amber-900",
  error: "text-rose-900",
  info: "text-slate-700",
};

export function DataBanner({ source, status, reason, diagnostics = [] }: DataBannerProps) {
  // Only surface real errors — empty tables and info messages are expected in normal operation
  const hasCriticalProblem = diagnostics.some((item) => item.status === "error");

  if (status === "loading") {
    return null;
  }

  if (source === "supabase" && !reason && !hasCriticalProblem) {
    return null;
  }

  // Only show for real errors: connection failure or source fell back to mock
  const title = source === "supabase" ? "Error de conexión" : "Sin conexión a Supabase";
  const detail = reason ?? "No fue posible usar Supabase en este momento y el portal cayó a datos de respaldo.";

  return (
    <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-6">{detail}</p>
      {diagnostics.filter((d) => d.status === "error").length > 0 ? (
        <details className="mt-3 rounded-2xl bg-white/50 px-3 py-2">
          <summary className="cursor-pointer font-medium">Ver diagnóstico</summary>
          <div className="mt-3 space-y-2">
            {diagnostics.filter((d) => d.status === "error").map((item) => (
              <div key={`${item.scope}-${item.status}-${item.message}`} className="rounded-xl border border-black/5 bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.scope}</p>
                <p className={cn("mt-1 text-sm font-medium", diagnosticTone[item.status])}>{item.message}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}