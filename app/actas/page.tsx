"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataBanner } from "@/components/portal/data-banner";
import { SectionCard } from "@/components/portal/section-card";
import { ActaForm } from "@/components/portal/acta-form";
import { ActaDetail } from "@/components/portal/acta-detail";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";
import { formatDate } from "@/lib/utils";
import type { Acta, ActaRecordMode, SessionType } from "@/types/domain";

function formatSchedule(acta: Acta) {
  if (acta.hora_inicio && acta.hora_termino) {
    return `${acta.hora_inicio} – ${acta.hora_termino}`;
  }

  if (acta.hora_inicio) {
    return acta.hora_inicio;
  }

  return "—";
}

export default function ActasPage() {
  const { snapshot, status, refresh } = usePortalSnapshot();
  const rows = snapshot.actas;

  // ── Form drawer ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editActa, setEditActa] = useState<Acta | null>(null);

  // ── Detail/read-only view — #29 ──────────────────────────────────────────
  const [viewActa, setViewActa] = useState<Acta | null>(null);

  // ── Delete confirmation — #38 ────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Acta | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Search & filters — #27 ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState<SessionType | "">("");
  const [filterModo, setFilterModo] = useState<ActaRecordMode | "">("");

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((acta) => {
      const matchesTipo = filterTipo ? acta.tipo_sesion === filterTipo : true;
      const matchesModo = filterModo ? acta.modo_registro === filterModo : true;
      if (!matchesTipo || !matchesModo) return false;
      if (!q) return true;
      return (
        acta.tabla_temas.toLowerCase().includes(q) ||
        acta.acuerdos.toLowerCase().includes(q) ||
        acta.observacion_documental.toLowerCase().includes(q) ||
        acta.lugar.toLowerCase().includes(q) ||
        acta.rbd.toLowerCase().includes(q) ||
        acta.comuna.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, filterModo, filterTipo]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openNew() {
    setEditActa(null);
    setFormOpen(true);
  }

  function openEdit(acta: Acta) {
    setEditActa(acta);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { deleteActa } = await import("@/lib/supabase/queries");
    const ok = await deleteActa(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) refresh();
  }

  return (
    <div className="space-y-6">
      <DataBanner source={snapshot.source} status={status} reason={snapshot.reason} diagnostics={snapshot.diagnostics} />

      <SectionCard
        eyebrow="Consejos Escolares"
        title="Actas oficiales"
        description="Sistema Integral de actas de Consejos Escolares."
      >
        {/* Action bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search & filter — #27 */}
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar actas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
              />
            </div>
            <select
              value={filterModo}
              onChange={(e) => setFilterModo(e.target.value as ActaRecordMode | "")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="">Todos los registros</option>
              <option value="ACTA_COMPLETA">Acta completa</option>
              <option value="REGISTRO_DOCUMENTAL">Registro documental</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as SessionType | "")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="">Todos los tipos</option>
              <option value="Ordinaria">Ordinaria</option>
              <option value="Extraordinaria">Extraordinaria</option>
            </select>
          </div>
          <Button onClick={openNew}>Nueva acta</Button>
        </div>

        {/* Results count when filtering */}
        {(searchQuery || filterTipo || filterModo) && (
          <p className="mb-4 text-xs text-slate-500">
            {filteredRows.length} resultado{filteredRows.length !== 1 ? "s" : ""} encontrado{filteredRows.length !== 1 ? "s" : ""}
          </p>
        )}

        {filteredRows.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sesión</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">RBD</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Fecha</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:table-cell">Horario</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:table-cell">Formato</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:table-cell">Lugar</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((acta) => (
                  <tr
                    key={acta.id}
                    onClick={() => setViewActa(acta)}
                    className="cursor-pointer transition-colors hover:bg-mist/60"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">Consejo Escolar {acta.tipo_sesion}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-slate-500">N° {String(acta.sesion).padStart(2, "0")}</p>
                        <Badge tone={acta.modo_registro === "REGISTRO_DOCUMENTAL" ? "warn" : "success"}>
                          {acta.modo_registro === "REGISTRO_DOCUMENTAL" ? "Documental" : "Completa"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-ocean">{acta.rbd}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(acta.fecha)}</td>
                    <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">{formatSchedule(acta)}</td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <Badge tone="success">{acta.formato}</Badge>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-600 lg:table-cell">{acta.lugar}{acta.lugar && acta.comuna ? ", " : ""}{acta.comuna}</td>
                    <td className="px-4 py-3.5">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEdit(acta)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acta)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-ember ring-1 ring-ember/30 transition hover:bg-ember/5"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            Sin datos en esta sección.
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
            Ningún acta coincide con la búsqueda.
          </div>
        )}
      </SectionCard>

      {/* Form drawer */}
      <ActaForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        establishments={snapshot.establishments}
        actas={rows}
        editActa={editActa}
        onSaved={() => refresh()}
      />

      {/* Detail view — #29 #34 */}
      <ActaDetail acta={viewActa} onClose={() => setViewActa(null)} establishments={snapshot.establishments} />

      {/* Delete confirmation — #38 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`¿Eliminar acta N° ${deleteTarget ? String(deleteTarget.sesion).padStart(2, "0") : ""}?`}
        description={
          deleteTarget
            ? `Se eliminará "${deleteTarget.tipo_sesion} #${String(deleteTarget.sesion).padStart(2, "0")}" del ${formatDate(deleteTarget.fecha)}. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
