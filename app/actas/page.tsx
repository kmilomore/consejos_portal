"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataBanner } from "@/components/portal/data-banner";
import { SectionCard } from "@/components/portal/section-card";
import { ActaForm } from "@/components/portal/acta-form";
import { ActaDetail } from "@/components/portal/acta-detail";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { usePortalSnapshot } from "@/lib/hooks/use-portal-snapshot";
import { usePortalAuth } from "@/lib/auth/context";
import { formatDate } from "@/lib/utils";
import type { Acta, ActaRecordMode, SessionType } from "@/types/domain";

type SearchField = "all" | "establishment" | "topics" | "agreements" | "comuna" | "rbd";

function formatSchedule(acta: Acta) {
  if (acta.hora_inicio && acta.hora_termino) {
    return `${acta.hora_inicio} – ${acta.hora_termino}`;
  }

  if (acta.hora_inicio) {
    return acta.hora_inicio;
  }

  return "—";
}

function matchesSessionFilter(session: number, rawFilter: string) {
  const normalized = rawFilter.trim();
  if (!normalized) {
    return true;
  }

  if (/^\d+$/.test(normalized)) {
    return session === Number(normalized);
  }

  const rangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!rangeMatch) {
    return false;
  }

  const start = Number(rangeMatch[1]);
  const end = Number(rangeMatch[2]);
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  return session >= min && session <= max;
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadFile(content: BlobPart, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function ActasPage() {
  const { snapshot, status, refresh } = usePortalSnapshot();
  const { isGlobalAdmin, isReadOnly } = usePortalAuth();
  const searchParams = useSearchParams();
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
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [filterSesion, setFilterSesion] = useState("");
  const [filterSchoolQuery, setFilterSchoolQuery] = useState("");
  const [filterComuna, setFilterComuna] = useState<string>("");
  const [filterTipo, setFilterTipo] = useState<SessionType | "">("");
  const [filterModo, setFilterModo] = useState<ActaRecordMode | "">("");
  const [sortField, setSortField] = useState<"fecha" | "sesion">("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const actaId = searchParams.get("acta");
    if (!actaId) {
      return;
    }

    const targetActa = rows.find((acta) => acta.id === actaId);
    if (targetActa) {
      setViewActa(targetActa);
    }
  }, [rows, searchParams]);

  const establishmentMap = useMemo(
    () => new Map(snapshot.establishments.map((e) => [e.rbd, e.nombre])),
    [snapshot.establishments],
  );

  const comunaOptions = useMemo(() => {
    return [...new Set(rows.map((acta) => acta.comuna).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }, [rows]);

  const hasActiveFilters = Boolean(searchQuery || filterSesion || filterTipo || filterModo || filterSchoolQuery || filterComuna || searchField !== "all");

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const schoolQuery = filterSchoolQuery.toLowerCase().trim();
    const sessionFilter = filterSesion.trim();
    const filtered = rows.filter((acta) => {
      const matchesTipo = filterTipo ? acta.tipo_sesion === filterTipo : true;
      const matchesModo = filterModo ? acta.modo_registro === filterModo : true;
      const matchesSesion = matchesSessionFilter(acta.sesion, sessionFilter);
      const establishmentName = establishmentMap.get(acta.rbd)?.toLowerCase() ?? "";
      const matchesSchool = schoolQuery
        ? establishmentName.includes(schoolQuery) || acta.rbd.toLowerCase().includes(schoolQuery)
        : true;
      const matchesComuna = filterComuna ? acta.comuna === filterComuna : true;
      if (!matchesTipo || !matchesModo || !matchesSesion || !matchesSchool || !matchesComuna) return false;
      if (!q) return true;
      const searchScopes: Record<SearchField, boolean> = {
        all: (
          acta.tabla_temas.toLowerCase().includes(q) ||
          acta.acuerdos.toLowerCase().includes(q) ||
          acta.observacion_documental.toLowerCase().includes(q) ||
          acta.lugar.toLowerCase().includes(q) ||
          acta.rbd.toLowerCase().includes(q) ||
          acta.comuna.toLowerCase().includes(q) ||
          establishmentName.includes(q)
        ),
        establishment: establishmentName.includes(q),
        topics: (
          acta.tabla_temas.toLowerCase().includes(q) ||
          acta.observacion_documental.toLowerCase().includes(q)
        ),
        agreements: acta.acuerdos.toLowerCase().includes(q),
        comuna: acta.comuna.toLowerCase().includes(q),
        rbd: acta.rbd.toLowerCase().includes(q),
      };

      return searchScopes[searchField];
    });
    return [...filtered].sort((a, b) => {
      const cmp = sortField === "fecha"
        ? a.fecha.localeCompare(b.fecha)
        : a.sesion - b.sesion;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, searchQuery, searchField, filterSesion, filterModo, filterTipo, filterSchoolQuery, filterComuna, sortField, sortDir, establishmentMap]);

  const exportRows = useMemo(() => {
    return filteredRows.map((acta) => ({
      sesion: acta.sesion,
      tipoSesion: acta.tipo_sesion,
      modoRegistro: acta.modo_registro,
      fecha: formatDate(acta.fecha),
      horario: formatSchedule(acta),
      establecimiento: establishmentMap.get(acta.rbd) ?? "",
      rbd: acta.rbd,
      comuna: acta.comuna,
      formato: acta.formato,
      lugar: acta.lugar,
      linkActa: acta.link_acta ?? "",
    }));
  }, [filteredRows, establishmentMap]);

  const visibleSummary = useMemo(() => {
    const completas = filteredRows.filter((acta) => acta.modo_registro === "ACTA_COMPLETA").length;
    const documentales = filteredRows.length - completas;
    const ordinarias = filteredRows.filter((acta) => acta.tipo_sesion === "Ordinaria").length;
    const conDocumento = filteredRows.filter((acta) => Boolean(acta.link_acta)).length;

    return {
      total: filteredRows.length,
      completas,
      documentales,
      ordinarias,
      conDocumento,
    };
  }, [filteredRows]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openNew() {
    setEditActa(null);
    setFormOpen(true);
  }

  function toggleSort(field: "fecha" | "sesion") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function openEdit(acta: Acta) {
    setEditActa(acta);
    setFormOpen(true);
  }

  function clearFilters() {
    setSearchQuery("");
    setSearchField("all");
    setFilterSesion("");
    setFilterSchoolQuery("");
    setFilterComuna("");
    setFilterTipo("");
    setFilterModo("");
  }

  function exportCsv() {
    if (exportRows.length === 0) {
      return;
    }

    const header = [
      "Sesion",
      "Tipo de sesion",
      "Modo de registro",
      "Fecha",
      "Horario",
      "Establecimiento",
      "RBD",
      "Comuna",
      "Formato",
      "Lugar",
      "Hipervinculo acta",
    ];

    const body = exportRows.map((row) => (
      [
        row.sesion,
        row.tipoSesion,
        row.modoRegistro,
        row.fecha,
        row.horario,
        row.establecimiento,
        row.rbd,
        row.comuna,
        row.formato,
        row.lugar,
        row.linkActa,
      ].map((value) => escapeCsvValue(value)).join(",")
    ));

    downloadFile(`\uFEFF${[header.map((value) => escapeCsvValue(value)).join(","), ...body].join("\n")}`, `actas-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
  }

  function exportExcel() {
    if (exportRows.length === 0) {
      return;
    }

    const tableRows = exportRows.map((row) => {
      const cells = [
        escapeHtml(row.sesion),
        escapeHtml(row.tipoSesion),
        escapeHtml(row.modoRegistro),
        escapeHtml(row.fecha),
        escapeHtml(row.horario),
        escapeHtml(row.establecimiento),
        escapeHtml(row.rbd),
        escapeHtml(row.comuna),
        escapeHtml(row.formato),
        escapeHtml(row.lugar),
        row.linkActa
          ? `<a href="${escapeHtml(row.linkActa)}" target="_blank" rel="noopener noreferrer">Abrir acta</a>`
          : "",
      ];

      return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
    }).join("");

    const workbook = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d4d4d8; padding: 6px 8px; vertical-align: top; }
      th { background: #f4f4f5; font-weight: 700; }
      a { color: #0f5f8f; }
    </style>
  </head>
  <body>
    <table>
      <thead>
        <tr>
          <th>Sesion</th>
          <th>Tipo de sesion</th>
          <th>Modo de registro</th>
          <th>Fecha</th>
          <th>Horario</th>
          <th>Establecimiento</th>
          <th>RBD</th>
          <th>Comuna</th>
          <th>Formato</th>
          <th>Lugar</th>
          <th>Hipervinculo acta</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

    downloadFile(`\uFEFF${workbook}`, `actas-${new Date().toISOString().slice(0, 10)}.xls`, "application/vnd.ms-excel;charset=utf-8;");
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
          <div className="flex flex-1 flex-wrap gap-2">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as SearchField)}
              className="rounded-card border border-neutral-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="all">Buscar en todo</option>
              <option value="establishment">Establecimiento</option>
              <option value="topics">Temas y observación</option>
              <option value="agreements">Acuerdos</option>
              <option value="comuna">Comuna</option>
              <option value="rbd">RBD</option>
            </select>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -tranneutral-y-1/2 text-neutral-400" />
              <input
                type="search"
                placeholder="Buscar actas…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-card border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm text-ink placeholder:text-neutral-400 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
              />
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="N° sesión o rango 1-5"
              value={filterSesion}
              onChange={(e) => setFilterSesion(e.target.value)}
              className="w-full rounded-card border border-neutral-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-400 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20 sm:w-36"
            />
            {isGlobalAdmin && snapshot.establishments.length > 0 && (
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -tranneutral-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  placeholder="Buscar establecimiento o RBD…"
                  value={filterSchoolQuery}
                  onChange={(e) => setFilterSchoolQuery(e.target.value)}
                  className="w-full rounded-card border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm text-ink placeholder:text-neutral-400 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
                />
              </div>
            )}
            <select
              value={filterComuna}
              onChange={(e) => setFilterComuna(e.target.value)}
              className="rounded-card border border-neutral-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="">Todas las comunas</option>
              {comunaOptions.map((comuna) => (
                <option key={comuna} value={comuna}>
                  {comuna}
                </option>
              ))}
            </select>
            <select
              value={filterModo}
              onChange={(e) => setFilterModo(e.target.value as ActaRecordMode | "")}
              className="rounded-card border border-neutral-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="">Todos los registros</option>
              <option value="ACTA_COMPLETA">Acta completa</option>
              <option value="REGISTRO_DOCUMENTAL">Registro documental</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as SessionType | "")}
              className="rounded-card border border-neutral-200 bg-white px-3 py-2 text-sm text-ink focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            >
              <option value="">Todos los tipos</option>
              <option value="Ordinaria">Ordinaria</option>
              <option value="Extraordinaria">Extraordinaria</option>
            </select>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearFilters}>Limpiar filtros</Button>
            )}
            {filteredRows.length > 0 && (
              <>
                <Button variant="secondary" onClick={exportCsv}>Descargar CSV</Button>
                <Button variant="secondary" onClick={exportExcel}>Descargar Excel</Button>
              </>
            )}
          </div>
          {!isReadOnly ? <Button onClick={openNew}>Nueva acta</Button> : null}
        </div>

        {isReadOnly ? (
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-700">
            Tu perfil colaborador puede revisar actas y exportar información, pero no crear, editar ni eliminar registros.
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Resultados</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{visibleSummary.total}</p>
          </div>
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Completas</p>
            <p className="mt-1 text-2xl font-semibold text-status-success00">{visibleSummary.completas}</p>
          </div>
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Documentales</p>
            <p className="mt-1 text-2xl font-semibold text-status-warning00">{visibleSummary.documentales}</p>
          </div>
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Ordinarias</p>
            <p className="mt-1 text-2xl font-semibold text-ocean">{visibleSummary.ordinarias}</p>
          </div>
          <div className="rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Con documento</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{visibleSummary.conDocumento}</p>
          </div>
        </div>

        {filteredRows.length > 0 ? (
          <div className="max-h-[68vh] overflow-auto rounded-card border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th
                    className="sticky top-0 z-10 cursor-pointer bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 hover:text-neutral-600"
                    onClick={() => toggleSort("sesion")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Sesión
                      {sortField === "sesion" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </span>
                  </th>
                  <th className="sticky top-0 z-10 bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Establecimiento</th>
                  <th
                    className="sticky top-0 z-10 cursor-pointer bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 hover:text-neutral-600"
                    onClick={() => toggleSort("fecha")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Fecha
                      {sortField === "fecha" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </span>
                  </th>
                  <th className="sticky top-0 z-10 hidden bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 md:table-cell">Horario</th>
                  <th className="sticky top-0 z-10 hidden bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:table-cell">Formato</th>
                  <th className="sticky top-0 z-10 hidden bg-neutral-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:table-cell">Lugar</th>
                  <th className="sticky top-0 z-10 bg-neutral-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRows.map((acta) => (
                  <tr
                    key={acta.id}
                    onClick={() => setViewActa(acta)}
                    className="cursor-pointer transition-colors hover:bg-mist/60"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">Consejo Escolar {acta.tipo_sesion}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-neutral-500">N° {String(acta.sesion).padStart(2, "0")}</p>
                        <Badge tone={acta.modo_registro === "REGISTRO_DOCUMENTAL" ? "warn" : "success"}>
                          {acta.modo_registro === "REGISTRO_DOCUMENTAL" ? "Documental" : "Completa"}
                        </Badge>
                        {acta.link_acta && (
                          <a
                            href={acta.link_acta}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Ver documento adjunto"
                            className="text-ocean hover:text-ocean/70"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-ink">{establishmentMap.get(acta.rbd) ?? acta.rbd}</p>
                      <p className="font-mono text-xs text-ocean">{acta.rbd}</p>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600">{formatDate(acta.fecha)}</td>
                    <td className="hidden px-4 py-3.5 text-neutral-500 md:table-cell">{formatSchedule(acta)}</td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <Badge tone="success">{acta.formato}</Badge>
                    </td>
                    <td className="hidden px-4 py-3.5 text-neutral-600 lg:table-cell">{acta.lugar}{acta.lugar && acta.comuna ? ", " : ""}{acta.comuna}</td>
                    <td className="px-4 py-3.5">
                      {!isReadOnly ? (
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
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-neutral-200 bg-neutral-50 px-5 py-8 text-sm text-neutral-600">
            Sin datos en esta sección.
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-neutral-200 bg-neutral-50 px-5 py-8 text-center text-sm text-neutral-600">
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
        extraordinarySessionReasons={snapshot.extraordinarySessionReasons}
        editActa={editActa}
        onSaved={() => refresh()}
      />

      {/* Detail view — #29 #34 */}
      <ActaDetail
        acta={viewActa}
        onClose={() => setViewActa(null)}
        establishments={snapshot.establishments}
        siblingActas={filteredRows}
        onNavigate={setViewActa}
      />

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
