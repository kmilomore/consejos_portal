"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, RefreshCcw, Search, Shield, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePortalAuth } from "@/lib/auth/context";
import { useSlepDirectorio } from "@/lib/hooks/use-slep-directorio";
import {
  deactivatePortalUserAccess,
  listPortalUserAccess,
  upsertPortalUserAccess,
} from "@/lib/supabase/queries";
import type { PortalManagedAccessRole, PortalUserAccess } from "@/types/domain";

type AccessFormState = {
  correo: string;
  rol: PortalManagedAccessRole;
  rbd: string;
  nombreReferencia: string;
};

const EMPTY_FORM: AccessFormState = {
  correo: "",
  rol: "REPRESENTANTE",
  rbd: "",
  nombreReferencia: "",
};

const ROLE_OPTIONS: Array<{
  value: PortalManagedAccessRole;
  label: string;
  team: string;
  requiresRbd: boolean;
}> = [
  { value: "ADMIN", label: "Administrador global", team: "", requiresRbd: false },
  { value: "COLABORADOR", label: "Colaborador global (solo lectura)", team: "", requiresRbd: false },
  { value: "DIRECTOR", label: "Director o directora", team: "DIRECCION", requiresRbd: true },
  { value: "REPRESENTANTE", label: "Representante consejo escolar", team: "CONSEJO_ESCOLAR", requiresRbd: true },
];

const PAGE_SIZE = 10;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getRoleConfig(role: PortalManagedAccessRole) {
  return ROLE_OPTIONS.find((option) => option.value === role) ?? ROLE_OPTIONS[0];
}

function buildAccessKey(row: {
  correo: string;
  rol: string;
  rbd: string | null;
  equipo: string;
}) {
  return [normalizeEmail(row.correo), row.rol.trim().toUpperCase(), row.rbd ?? "__GLOBAL__", row.equipo.trim().toUpperCase()].join("|");
}

function getReferenceName(row: PortalUserAccess) {
  const metadata = row.metadata;

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-card border border-neutral-200/80 bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { isGlobalAdmin, isLoading: isAuthLoading, user } = usePortalAuth();
  const { data: schools } = useSlepDirectorio();
  const [rows, setRows] = useState<PortalUserAccess[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<AccessFormState>(EMPTY_FORM);
  const [editingRow, setEditingRow] = useState<PortalUserAccess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortalUserAccess | null>(null);

  const currentUserEmail = normalizeEmail(user?.email ?? "");

  useEffect(() => {
    if (!isAuthLoading && !isGlobalAdmin) {
      router.replace("/admin/");
    }
  }, [isAuthLoading, isGlobalAdmin, router]);

  async function loadRows() {
    setIsLoadingRows(true);
    const result = await listPortalUserAccess();
    if (result.errorMessage) {
      toast(result.errorMessage, "error");
    }
    setRows(result.data);
    setIsLoadingRows(false);
  }

  useEffect(() => {
    if (!isGlobalAdmin) {
      return;
    }

    void loadRows();
  }, [isGlobalAdmin]);

  const schoolMap = useMemo(() => {
    return new Map(
      schools
        .filter((school) => typeof school.rbd === "string" && school.rbd)
        .map((school) => [school.rbd as string, school]),
    );
  }, [schools]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const school = row.rbd ? schoolMap.get(row.rbd) ?? null : null;
      const matchesQuery = !normalizedQuery || [
        row.correo_electronico,
        row.email_normalizado,
        row.rol,
        row.equipo,
        row.rbd,
        school?.nombre_establecimiento,
        school?.comuna,
        getReferenceName(row),
      ].some((value) => typeof value === "string" && value.toLowerCase().includes(normalizedQuery));

      const matchesRole = !roleFilter || row.rol === roleFilter;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? row.activo : !row.activo);

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, rows, schoolMap, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);

  const stats = useMemo(() => {
    const activeRows = rows.filter((row) => row.activo);
    const uniqueUsers = new Set(activeRows.map((row) => row.email_normalizado));
    const globalAdmins = activeRows.filter((row) => row.rol === "ADMIN" && !row.rbd).length;
    const coveredSchools = new Set(activeRows.flatMap((row) => row.rbd ? [row.rbd] : []));

    return {
      activeUsers: uniqueUsers.size,
      activeAssignments: activeRows.length,
      globalAdmins,
      coveredSchools: coveredSchools.size,
    };
  }, [rows]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingRow(null);
  }

  function handleRoleChange(nextRole: PortalManagedAccessRole) {
    const config = getRoleConfig(nextRole);
    setForm((current) => ({
      ...current,
      rol: nextRole,
      rbd: config.requiresRbd ? current.rbd : "",
    }));
  }

  function handleEdit(row: PortalUserAccess) {
    setEditingRow(row);
    setForm({
      correo: row.correo_electronico,
      rol: (row.rol === "ADMIN" || row.rol === "DIRECTOR" ? row.rol : "REPRESENTANTE") as PortalManagedAccessRole,
      rbd: row.rbd ?? "",
      nombreReferencia: getReferenceName(row),
    });
  }

  function buildMetadata() {
    const config = getRoleConfig(form.rol);
    const school = form.rbd ? schoolMap.get(form.rbd) ?? null : null;
    const referenceName = form.nombreReferencia.trim();
    const metadata: Record<string, unknown> = {
      display_name: referenceName || form.correo.trim(),
    };

    if (school?.comuna) {
      metadata.comuna = school.comuna;
    }

    if (config.value === "DIRECTOR") {
      metadata.director = referenceName || form.correo.trim();
    }

    if (config.value === "REPRESENTANTE") {
      metadata.representante = referenceName || form.correo.trim();
    }

    if (school?.nombre_establecimiento) {
      metadata.establecimiento = school.nombre_establecimiento;
    }

    return metadata;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const correo = form.correo.trim();
    const config = getRoleConfig(form.rol);

    if (!correo || !correo.includes("@")) {
      toast("Debes ingresar un correo válido.", "error");
      return;
    }

    if (config.requiresRbd && !form.rbd) {
      toast("Debes seleccionar una escuela para ese rol.", "error");
      return;
    }

    setIsSubmitting(true);

    const nextKey = buildAccessKey({
      correo,
      rol: config.value,
      rbd: config.requiresRbd ? form.rbd : null,
      equipo: config.team,
    });

    const previousKey = editingRow
      ? buildAccessKey({
        correo: editingRow.correo_electronico,
        rol: editingRow.rol,
        rbd: editingRow.rbd,
        equipo: editingRow.equipo,
      })
      : null;

    const upsertResult = await upsertPortalUserAccess({
      correo_electronico: correo,
      rbd: config.requiresRbd ? form.rbd : null,
      rol: config.value,
      equipo: config.team,
      origen: "manual",
      metadata: buildMetadata(),
    });

    if (!upsertResult.ok) {
      setIsSubmitting(false);
      toast(upsertResult.errorMessage ?? "No fue posible guardar el acceso.", "error");
      return;
    }

    if (editingRow && previousKey !== nextKey) {
      const deactivateResult = await deactivatePortalUserAccess(editingRow.id);
      if (!deactivateResult.ok) {
        setIsSubmitting(false);
        toast(deactivateResult.errorMessage ?? "El nuevo acceso se guardó, pero no fue posible desactivar la asignación anterior.", "error");
        await loadRows();
        return;
      }
    }

    await loadRows();
    resetForm();
    setIsSubmitting(false);
    toast(editingRow ? "Acceso actualizado." : "Acceso agregado.", "success");
  }

  async function handleDeactivate() {
    if (!deleteTarget) {
      return;
    }

    setIsSubmitting(true);
    const result = await deactivatePortalUserAccess(deleteTarget.id);
    setIsSubmitting(false);

    if (!result.ok) {
      toast(result.errorMessage ?? "No fue posible desactivar el acceso.", "error");
      return;
    }

    await loadRows();
    setDeleteTarget(null);
    if (editingRow?.id === deleteTarget.id) {
      resetForm();
    }
    toast("Acceso desactivado.", "success");
  }

  if (!isAuthLoading && !isGlobalAdmin) {
    return (
      <Alert tone="warning" variant="tinted" title="Acceso restringido">
        Esta sección está disponible solo para administradores globales. Serás redirigido al panel territorial.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.34em] text-ocean">Administración global</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Gestión de usuarios</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">
            Crea accesos manuales, asigna roles y escuelas, y desactiva permisos existentes del portal.
          </p>
        </div>

        <Button variant="secondary" onClick={() => void loadRows()} disabled={isLoadingRows || isSubmitting} className="gap-2 self-start">
          <RefreshCcw className="h-4 w-4" />
          Recargar
        </Button>
      </div>

      <Alert tone="info" variant="tinted" title="Cómo opera este panel">
        Las filas con origen distinto de <strong>manual</strong> vienen sincronizadas desde la base maestra y aquí se muestran como referencia. Este panel crea y gestiona accesos manuales del portal; los accesos sincronizados deben corregirse en su fuente de origen si se quiere un cambio persistente.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios activos" value={stats.activeUsers} sub="correos únicos con acceso activo" />
        <StatCard label="Asignaciones activas" value={stats.activeAssignments} sub="roles y escuelas vigentes" />
        <StatCard label="Admins globales" value={stats.globalAdmins} sub="accesos globales sin escuela" />
        <StatCard label="Escuelas cubiertas" value={stats.coveredSchools} sub="RBD con acceso manual o sincronizado" />
      </div>

      <div className="space-y-6">
        <section className="rounded-modal border border-neutral-200/80 bg-white p-6 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-neutral-400">
                {editingRow ? "Editar acceso" : "Nuevo acceso"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                {editingRow ? "Actualizar asignación manual" : "Agregar usuario al portal"}
              </h2>
            </div>
            {editingRow && (
              <Button variant="ghost" onClick={resetForm}>Limpiar</Button>
            )}
          </div>

          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Correo</span>
              <input
                type="email"
                value={form.correo}
                onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
                placeholder="nombre@dominio.cl"
                className="h-11 w-full rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Rol</span>
              <select
                value={form.rol}
                onChange={(event) => handleRoleChange(event.target.value as PortalManagedAccessRole)}
                className="h-11 w-full rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {getRoleConfig(form.rol).requiresRbd && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">Escuela asociada</span>
                <select
                  value={form.rbd}
                  onChange={(event) => setForm((current) => ({ ...current, rbd: event.target.value }))}
                  className="h-11 w-full rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
                >
                  <option value="">Selecciona una escuela</option>
                  {schools
                    .filter((school) => school.rbd)
                    .sort((left, right) => (left.nombre_establecimiento ?? "").localeCompare(right.nombre_establecimiento ?? ""))
                    .map((school) => (
                      <option key={school.rbd ?? ""} value={school.rbd ?? ""}>
                        {(school.nombre_establecimiento ?? "Sin nombre")} · RBD {school.rbd}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-ink">Nombre de referencia</span>
              <input
                type="text"
                value={form.nombreReferencia}
                onChange={(event) => setForm((current) => ({ ...current, nombreReferencia: event.target.value }))}
                placeholder="Opcional, para identificar el acceso"
                className="h-11 w-full rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
              />
            </label>

            <div className="rounded-card bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-600 ring-1 ring-neutral-200">
              {form.rol === "ADMIN"
                ? "El administrador global entra al panel completo y no queda vinculado a un RBD específico."
                : form.rol === "COLABORADOR"
                  ? "El colaborador global puede ver toda la información del portal, pero no crear, editar ni eliminar registros."
                : form.rol === "DIRECTOR"
                  ? "El acceso director usa la escuela seleccionada como establecimiento principal para resumen, programación, actas y métricas."
                  : "El acceso representante abre navegación tipo admin, pero con alcance parcial según la escuela asociada."}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {editingRow ? "Guardar cambios" : "Agregar acceso"}
            </Button>
          </form>
        </section>

        <section className="rounded-modal border border-neutral-200/80 bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-neutral-400">Accesos registrados</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">{filteredRows.length} filas visibles</h2>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar correo, rol, escuela o RBD"
                    className="h-10 rounded-card border border-neutral-200 bg-white pl-9 pr-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/20"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-10 rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean"
                >
                  <option value="">Todos los roles</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                  className="h-10 rounded-card border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean"
                >
                  <option value="active">Solo activos</option>
                  <option value="inactive">Solo inactivos</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            </div>

            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/85">
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur lg:px-6">Usuario</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur">Rol</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur">Escuela</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur">Origen</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur">Estado</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur">Actualizado</th>
                  <th className="sticky top-0 z-10 bg-neutral-50/95 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 backdrop-blur lg:pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRows ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">Cargando accesos...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">No hay accesos que coincidan con los filtros actuales.</td>
                  </tr>
                ) : paginatedRows.map((row) => {
                  const school = row.rbd ? schoolMap.get(row.rbd) ?? null : null;
                  const isManual = row.origen === "manual";
                  const isSelfGlobalAdmin = row.rol === "ADMIN" && !row.rbd && row.email_normalizado === currentUserEmail;

                  return (
                    <tr key={row.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60">
                      <td className="px-4 py-4 align-top lg:px-6">
                        <p className="text-sm font-semibold text-ink">{getReferenceName(row) || row.correo_electronico}</p>
                        <p className="mt-1 text-xs text-neutral-500">{row.correo_electronico}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <Badge tone={row.rol === "ADMIN" ? "warn" : "neutral"}>{row.rol}</Badge>
                          <span className="text-xs text-neutral-500">{row.equipo || "Global"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {row.rbd ? (
                          <div>
                            <p className="text-sm font-medium text-ink">{school?.nombre_establecimiento ?? "Escuela no encontrada"}</p>
                            <p className="mt-1 text-xs text-neutral-500">RBD {row.rbd}{school?.comuna ? ` · ${school.comuna}` : ""}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-500">Acceso global</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Badge tone={isManual ? "success" : "neutral"}>{row.origen}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Badge tone={row.activo ? "success" : "warn"}>{row.activo ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-neutral-600">
                        {formatDateTime(row.updated_at)}
                      </td>
                      <td className="px-4 py-4 align-top text-right lg:pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleEdit(row)}
                            disabled={!isManual || isSelfGlobalAdmin || isSubmitting}
                            title={!isManual ? "Las filas sincronizadas se editan en su fuente de origen." : isSelfGlobalAdmin ? "No desplaces tu propio acceso global desde esta vista." : "Editar acceso"}
                            className="h-9 px-3"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setDeleteTarget(row)}
                            disabled={!isManual || isSelfGlobalAdmin || !row.activo || isSubmitting}
                            title={!isManual ? "Las filas sincronizadas se desactivan en su fuente de origen." : isSelfGlobalAdmin ? "No puedes desactivar tu propio acceso global desde esta vista." : "Desactivar acceso"}
                            className="h-9 px-3 text-status-danger hover:text-status-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-500">
              Página {currentPage} de {totalPages}. Mostrando {paginatedRows.length} de {filteredRows.length} accesos filtrados.
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-card border border-ocean/15 bg-ocean/5 px-5 py-4 text-sm text-neutral-700">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-ocean" />
          <div>
            <p className="font-semibold text-ink">Buenas prácticas para este panel</p>
            <p className="mt-1 leading-6 text-neutral-600">
              Usa <strong>Administrador global</strong> solo para equipo interno. Para escuelas concretas, prefiere <strong>Director</strong> o <strong>Representante</strong> con su RBD asociado. Así el alcance queda alineado con `get_current_portal_scope()` y no se abre visibilidad más amplia de la necesaria.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Desactivar acceso"
        description={deleteTarget ? `Se desactivará el acceso de ${deleteTarget.correo_electronico}${deleteTarget.rbd ? ` para el RBD ${deleteTarget.rbd}` : " con alcance global"}.` : ""}
        confirmLabel="Desactivar"
        tone="danger"
        onConfirm={() => void handleDeactivate()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}