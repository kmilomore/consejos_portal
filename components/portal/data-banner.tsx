import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PortalDataSource, PortalDiagnostic } from "@/lib/supabase/queries";

interface DataBannerProps {
  source: PortalDataSource;
  status: "loading" | "ready";
  reason?: string;
  diagnostics?: PortalDiagnostic[];
}

const diagnosticTone = {
  ok:    "text-status-success",
  empty: "text-status-warning",
  error: "text-status-danger",
  info:  "text-neutral-700",
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
    <Alert tone="danger" variant="tinted" title={title}>
      <p>{detail}</p>
      {diagnostics.filter((d) => d.status === "error").length > 0 ? (
        <details className="mt-3 rounded-card bg-white/50 px-3 py-2">
          <summary className="cursor-pointer font-medium text-status-danger">Ver diagnóstico</summary>
          <div className="mt-3 space-y-2">
            {diagnostics.filter((d) => d.status === "error").map((item) => (
              <div key={`${item.scope}-${item.status}-${item.message}`} className="rounded-card border border-black/5 bg-white/70 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{item.scope}</p>
                <p className={cn("mt-1 text-sm font-medium", diagnosticTone[item.status])}>{item.message}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Alert>
  );
}
