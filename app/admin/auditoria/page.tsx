"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, KeyRound, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/lib/auth/context";
import { useSlepDirectorio } from "@/lib/hooks/use-slep-directorio";
import { listPortalAccessAudit, listPortalLogs } from "@/lib/supabase/queries";
import type { LogEntry, PortalAccessAuditEntry, PortalAccessAuditSnapshot } from "@/types/domain";

type AuditSource = "portal" | "access";

type AuditTimelineRow = {
  id: string;
  source: AuditSource;
  occurredAt: string;
  actor: string;
  actionLabel: string;
  subject: string;
  detail: string;
  context: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSnapshotReferenceName(snapshot: PortalAccessAuditSnapshot | null) {
  if (!snapshot) {
    return "";
  }

  const metadata = snapshot.metadata;

  if (typeof metadata.display_name === "string" && metadata.display_name.trim()) {
    return metadata.display_name.trim();
  }

  if (typeof metadata.director === "string" && metadata.director.trim()) {
    return metadata.director.trim();
  }

  if (typeof metadata.representante === "string" && metadata.representante.trim()) {
    return metadata.representante.trim();
  }

  return "";
}

function getAffectedAccessSnapshot(entry: PortalAccessAuditEntry) {
  return entry.snapshot_despues ?? entry.snapshot_antes;
}

function getAccessChangeDetails(entry: PortalAccessAuditEntry) {
  const before = entry.snapshot_antes;
  const after = entry.snapshot_despues;

  if (entry.accion === "CREADO") {
    return "Alta de acceso registrada en usuario_establecimiento_roles.";
  }

  if (entry.accion === "DESACTIVADO") {
    return "Acceso desactivado sin eliminar el historial anterior.";
  }

  const changes: string[] = [];

  if (before?.correo_electronico !== after?.correo_electronico) {
    changes.push("correo");
  }

  if (before?.rol !== after?.rol) {
    changes.push("rol");
  }

  if ((before?.rbd ?? "") !== (after?.rbd ?? "")) {
    changes.push("RBD");
  }

  if (before?.equipo !== after?.equipo) {
    changes.push("equipo");
  }

  if (before?.origen !== after?.origen) {
    changes.push("origen");
  }

  const beforeName = getSnapshotReferenceName(before);
  const afterName = getSnapshotReferenceName(after);
  if (beforeName !== afterName) {
    changes.push("nombre de referencia");
  }

  if (changes.length === 0) {
    return "Actualización de acceso sin cambio visible en los campos resumidos.";
  }

  return `Campos modificados: ${changes.join(", ")}.`;
}

function getAccessActionLabel(entry: PortalAccessAuditEntry) {
  switch (entry.accion) {
    case "CREADO":
      return "Creó acceso";
    case "DESACTIVADO":
      return "Desactivó acceso";
    default:
      return "Actualizó acceso";
  }
}

function getAccessContext(snapshot: PortalAccessAuditSnapshot | null, schoolMap: Map<string, string>) {
  if (!snapshot?.rbd) {
    return "Alcance global";
  }

  const schoolName = schoolMap.get(snapshot.rbd);
  return schoolName ? `${schoolName} · RBD ${snapshot.rbd}` : `RBD ${snapshot.rbd}`;
}

function mapAccessAudit(entry: PortalAccessAuditEntry, schoolMap: Map<string, string>): AuditTimelineRow {
  const snapshot = getAffectedAccessSnapshot(entry);
  const referenceName = getSnapshotReferenceName(snapshot);
  const subject = snapshot
    ? `${referenceName ? `${referenceName} · ` : ""}${snapshot.correo_electronico}`
    : "Acceso sin snapshot";

  return {
    id: `access-${entry.id}`,
    source: "access",
    occurredAt: entry.created_at,
    actor: entry.admin_email,
    actionLabel: getAccessActionLabel(entry),
    subject,
    detail: getAccessChangeDetails(entry),
    context: getAccessContext(snapshot, schoolMap),
  };
}

function getPortalActionLabel(log: LogEntry) {
  switch (log.accion) {
    case "LOGIN":
      return "Ingresó al portal";
    case "CREAR_ACTA":
      return "Creó acta";
    case "EDITAR_ACTA":
      return "Editó acta";
    case "ELIMINAR_ACTA":
      return "Eliminó acta";
    default:
      return log.accion;
  }
}

function mapPortalLog(log: LogEntry, schoolMap: Map<string, string>): AuditTimelineRow {
  const schoolName = schoolMap.get(log.rbd);

  return {
    id: `portal-${log.id}`,
    source: "portal",
    occurredAt: log.created_at,
    actor: log.usuario,
    actionLabel: getPortalActionLabel(log),
    subject: schoolName ? `${schoolName} · RBD ${log.rbd}` : `RBD ${log.rbd}`,
    detail: log.detalle,
    context: log.vista_origen,
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-card border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-card bg-ocean/10 text-ocean">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

export default function AdminAuditoriaPage() {
  const router = useRouter();
  const { isGlobalAdmin, isLoading: isAuthLoading } = usePortalAuth();
  const { data: schools } = useSlepDirectorio();
  const [rows, setRows] = useState<AuditTimelineRow[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | AuditSource>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const schoolMap = useMemo(
    () => new Map(schools.flatMap((school) => school.rbd && school.nombre_establecimiento ? [[school.rbd, school.nombre_establecimiento]] : [])),
    [schools],
  );

  useEffect(() => {
    if (!isAuthLoading && !isGlobalAdmin) {
      router.replace("/admin/");
    }
  }, [isAuthLoading, isGlobalAdmin, router]);

  useEffect(() => {
    if (!isGlobalAdmin) {
      return;
    }

    let cancelled = false;

    async function loadAuditTrail() {
      setIsLoading(true);
      setErrorMessage(null);

      const [portalLogsResult, accessAuditResult] = await Promise.all([
        listPortalLogs(80),
        listPortalAccessAudit(80),
      ]);

      if (cancelled) {
        return;
      }

      const nextRows = [
        ...portalLogsResult.data.map((row) => mapPortalLog(row, schoolMap)),
        ...accessAuditResult.data.map((row) => mapAccessAudit(row, schoolMap)),
      ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

      setRows(nextRows);

      const issues = [portalLogsResult.errorMessage, accessAuditResult.errorMessage].filter(Boolean);
      setErrorMessage(issues.length > 0 ? issues.join(" ") : null);
      setIsLoading(false);
    }

    void loadAuditTrail();

    return () => {
      cancelled = true;
    };
  }, [isGlobalAdmin, schoolMap]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSource = sourceFilter === "all" || row.source === sourceFilter;
      const matchesQuery = !normalizedQuery || [row.actor, row.actionLabel, row.subject, row.detail, row.context]
        .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesSource && matchesQuery;
    });
  }, [query, rows, sourceFilter]);

  const portalEventCount = rows.filter((row) => row.source === "portal").length;
  const accessChangeCount = rows.filter((row) => row.source === "access").length;
  const loginCount = rows.filter((row) => row.actionLabel === "Ingresó al portal").length;

  if (!isGlobalAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">Admin global</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Auditoría del portal</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Consolida trazabilidad de ingresos al portal y cambios de acceso ejecutados sobre permisos del sistema.
        </p>
      </div>

      {errorMessage && (
        <Alert tone="danger" variant="tinted" title="Carga parcial de auditoría">
          <p>{errorMessage}</p>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Eventos portal" value={portalEventCount} sub="logs operativos visibles" icon={Activity} />
        <StatCard label="Cambios de acceso" value={accessChangeCount} sub="altas, cambios y desactivaciones" icon={ShieldCheck} />
        <StatCard label="Ingresos detectados" value={loginCount} sub="eventos LOGIN en la bitácora" icon={KeyRound} />
      </div>

      <section className="rounded-modal border border-neutral-200/80 bg-white shadow-lg">
        <div className="border-b border-neutral-100 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-neutral-400">Bitácora central</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">Trazabilidad reciente</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Incluye `logs` operativos y auditoría dedicada sobre `usuario_establecimiento_roles`.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar actor, acción, detalle o contexto"
                  className="h-11 w-full rounded-card border border-neutral-200 bg-white pl-10 pr-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                />
              </label>

              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as "all" | AuditSource)}
                className="h-11 rounded-card border border-neutral-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
              >
                <option value="all">Todas las fuentes</option>
                <option value="portal">Eventos portal</option>
                <option value="access">Cambios de acceso</option>
              </select>

              <Button variant="secondary" onClick={() => window.location.reload()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Recargar
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/85">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 lg:px-6">Fecha</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Fuente</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Actor</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Acción</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Afectado</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Detalle</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 lg:pr-6">Contexto</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">Cargando auditoría...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">No hay eventos que coincidan con el filtro actual.</td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60">
                    <td className="px-4 py-3 align-top text-sm text-neutral-600 lg:px-6">{formatDateTime(row.occurredAt)}</td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={row.source === "access" ? "warn" : "neutral"}>
                        {row.source === "access" ? "Accesos" : "Portal"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-sm font-semibold text-ink">{row.actor}</td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">{row.actionLabel}</td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-700">{row.subject}</td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-600">{row.detail}</td>
                    <td className="px-4 py-3 align-top text-sm text-neutral-500 lg:pr-6">{row.context}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}