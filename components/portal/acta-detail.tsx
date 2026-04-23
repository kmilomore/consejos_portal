"use client";

import { X, ExternalLink, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Acta } from "@/types/domain";

interface ActaDetailProps {
  acta: Acta | null;
  onClose: () => void;
}

export function ActaDetail({ acta, onClose }: ActaDetailProps) {
  if (!acta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:block print:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <aside className="relative flex w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl max-h-[90vh] print:fixed print:inset-0 print:max-w-full print:rounded-none print:shadow-none print:max-h-none">

        {/* Header — hidden on print */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ocean">
              {acta.rbd}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {acta.tipo_sesion} #{String(acta.sesion).padStart(2, "0")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
            <button
              type="button"
              aria-label="Cerrar detalle"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block px-8 pt-8 pb-4 border-b border-slate-300">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            SLEP Colchagua — Consejo Escolar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            Acta {acta.tipo_sesion} N°{String(acta.sesion).padStart(2, "0")}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {acta.rbd} · {acta.lugar}, {acta.comuna}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 print:overflow-visible print:px-8">

          {/* Información de sesión */}
          <section>
            <SectionLabel>Información de la sesión</SectionLabel>
            <div className="grid gap-3 rounded-2xl bg-mist p-4 text-sm sm:grid-cols-2 print:rounded-none print:bg-transparent print:p-0 print:border print:border-slate-200 print:rounded-xl print:p-4">
              <Row label="Fecha" value={formatDate(acta.fecha)} />
              <Row label="Horario" value={`${acta.hora_inicio} – ${acta.hora_termino}`} />
              <Row label="Formato" value={acta.formato} />
              <Row label="Lugar" value={acta.lugar || "—"} />
              <Row label="Comuna" value={acta.comuna} />
              <Row label="Dirección" value={acta.direccion || "—"} />
            </div>
          </section>

          {/* Asistencia */}
          <section>
            <SectionLabel>Asistencia estamental</SectionLabel>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Estamento
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Nombre
                    </th>
                    <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:table-cell">
                      Correo
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Asistió
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {acta.asistentes.length > 0 ? (
                    acta.asistentes.map((a) => (
                      <tr key={a.rol}>
                        <td className="px-4 py-3 font-medium text-ink">{a.rol}</td>
                        <td className="px-4 py-3 text-slate-600">{a.nombre || "—"}</td>
                        <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                          {a.correo || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge tone={a.asistio ? "success" : "warn"}>
                            {a.asistio ? "Sí" : "No"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-5 text-center text-sm text-slate-400"
                      >
                        Sin asistentes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Invitados */}
          {acta.invitados.length > 0 && (
            <section>
              <SectionLabel>Invitados externos</SectionLabel>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Nombre
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Cargo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {acta.invitados.map((g) => (
                      <tr key={g.id}>
                        <td className="px-4 py-3 font-medium text-ink">{g.nombre}</td>
                        <td className="px-4 py-3 text-slate-600">{g.cargo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Desarrollo y acuerdos */}
          <section>
            <SectionLabel>Desarrollo y acuerdos</SectionLabel>
            <div className="space-y-4">
              <Field label="Tabla de temas" value={acta.tabla_temas} />
              {acta.desarrollo && (
                <Field label="Desarrollo de la sesión" value={acta.desarrollo} />
              )}
              <Field label="Acuerdos y compromisos" value={acta.acuerdos} />
              {acta.varios && <Field label="Varios" value={acta.varios} />}
              {acta.proxima_sesion && (
                <Row label="Próxima sesión" value={formatDate(acta.proxima_sesion)} />
              )}
            </div>
          </section>

          {/* Evidencia */}
          {acta.link_acta && (
            <section>
              <SectionLabel>Evidencia documental</SectionLabel>
              <a
                href={acta.link_acta}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean hover:underline print:hidden"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver documento PDF
              </a>
              <p className="hidden text-sm text-slate-600 print:block">{acta.link_acta}</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-ocean print:text-slate-500">
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <p className="mt-0.5 font-medium text-ink">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}
