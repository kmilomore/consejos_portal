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
import type { Acta, SessionType } from "@/types/domain";

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

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((acta) => {
      const matchesTipo = filterTipo ? acta.tipo_sesion === filterTipo : true;
      if (!matchesTipo) return false;
      if (!q) return true;
      return (
        acta.tabla_temas.toLowerCase().includes(q) ||
        acta.acuerdos.toLowerCase().includes(q) ||
        acta.lugar.toLowerCase().includes(q) ||
        acta.rbd.toLowerCase().includes(q) ||
        acta.comuna.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, filterTipo]);

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
        eyebrow="Flujo 02"
        title="Actas oficiales"
        description="La estructura ya considera asistentes estables, invitados libres, evidencia PDF y enlace con la programación de origen."
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
        {(searchQuery || filterTipo) && (
          <p className="mb-4 text-xs text-slate-500">
            {filteredRows.length} resultado{filteredRows.length !== 1 ? "s" : ""} encontrado{filteredRows.length !== 1 ? "s" : ""}
          </p>
        )}

        {filteredRows.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredRows.map((acta) => (
              <article key={acta.id} className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ocean">{acta.rbd}</p>
                    <h2 className="mt-2 text-xl font-semibold text-ink">
                      {acta.tipo_sesion} #{String(acta.sesion).padStart(2, "0")}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDate(acta.fecha)} · {acta.hora_inicio} a {acta.hora_termino}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge tone="success">{acta.formato}</Badge>
                    {/* Ver detalle — #29 */}
                    <button
                      type="button"
                      onClick={() => setViewActa(acta)}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(acta)}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                    >
                      Editar
                    </button>
                    {/* Eliminar — #38 */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(acta)}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-ember ring-1 ring-ember/30 transition hover:bg-ember/5"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
                  <p><span className="font-semibold text-ink">Lugar:</span> {acta.lugar}, {acta.comuna}</p>
                  <p><span className="font-semibold text-ink">Temas:</span> {acta.tabla_temas}</p>
                  <p><span className="font-semibold text-ink">Acuerdos:</span> {acta.acuerdos}</p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Asistencia oficial</p>
                    {acta.asistentes.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {acta.asistentes.map((asistente) => (
                          <li key={`${acta.id}-${asistente.rol}-${asistente.nombre}`} className="flex items-center justify-between gap-4">
                            <span>{asistente.rol}</span>
                            <Badge tone={asistente.asistio ? "success" : "warn"}>{asistente.asistio ? "Asistió" : "Ausente"}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">Sin asistentes registrados.</p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-mist p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Invitados</p>
                    {acta.invitados.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {acta.invitados.map((invitado) => (
                          <li key={invitado.id}>
                            <span className="font-medium text-ink">{invitado.nombre}</span> · {invitado.cargo}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">Sin invitados registrados.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
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
      <ActaDetail acta={viewActa} onClose={() => setViewActa(null)} />

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
