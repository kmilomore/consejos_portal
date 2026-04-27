"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  PencilLine,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { ActaDetail } from "@/components/portal/acta-detail";
import { ActaForm } from "@/components/portal/acta-form";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { DataBanner } from "@/components/portal/data-banner";
import { SectionCard } from "@/components/portal/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { usePortalSnapshot } from "@/lib/supabase/use-portal-snapshot";
import { cn, formatDate } from "@/lib/utils";
import type { Acta, PlanningStatus, Programacion, SessionFormat, SessionType } from "@/types/domain";

const sessionTypes: SessionType[] = ["Ordinaria", "Extraordinaria"];
const sessionFormats: SessionFormat[] = ["Presencial", "Online", "Híbrido"];
const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface ProgramacionFormState {
  tipo_sesion: SessionType;
  fecha_programada: string;
  hora_programada: string;
  formato_planeado: SessionFormat;
  lugar_tentativo: string;
  tematicas: string;
}

function toDateInputValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string) {
  return new Date(`${value}T00:00:00`);
}

function buildCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function makeEmptyForm(dateValue: string): ProgramacionFormState {
  return {
    tipo_sesion: "Ordinaria",
    fecha_programada: dateValue,
    hora_programada: "16:00",
    formato_planeado: "Presencial",
    lugar_tentativo: "",
    tematicas: "",
  };
}

function programacionToForm(programacion: Programacion): ProgramacionFormState {
  return {
    tipo_sesion: programacion.tipo_sesion,
    fecha_programada: programacion.fecha_programada,
    hora_programada: programacion.hora_programada,
    formato_planeado: programacion.formato_planeado,
    lugar_tentativo: programacion.lugar_tentativo,
    tematicas: programacion.tematicas,
  };
}

export default function ProgramacionPage() {
  const { snapshot, status, refresh } = usePortalSnapshot();
  const { establishment, profile, selectedRbd } = usePortalAuth();
  const activeRbd = selectedRbd ?? establishment?.rbd ?? profile?.rbd ?? null;
  const activeSchoolName = establishment?.nombre ?? "Establecimiento activo";
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [form, setForm] = useState<ProgramacionFormState>(() => makeEmptyForm(toDateInputValue(new Date())));
  const [editingProgramacion, setEditingProgramacion] = useState<Programacion | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Programacion | null>(null);
  const [actaProgramacion, setActaProgramacion] = useState<Programacion | null>(null);
  const [viewActa, setViewActa] = useState<Acta | null>(null);
  const [resolvedSessionNumber, setResolvedSessionNumber] = useState<number | null>(null);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [isResolvingNumber, setIsResolvingNumber] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [draggingProgramacionId, setDraggingProgramacionId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isReprogramming, setIsReprogramming] = useState(false);
  const [filterTipo, setFilterTipo] = useState<SessionType | "">("");
  const [filterEstado, setFilterEstado] = useState<PlanningStatus | "">("");
  const [searchQuery, setSearchQuery] = useState("");

  const baseRows = useMemo(
    () => snapshot.programaciones.filter((row) => !activeRbd || row.rbd === activeRbd),
    [activeRbd, snapshot.programaciones],
  );
  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return baseRows.filter((row) => {
      if (filterTipo && row.tipo_sesion !== filterTipo) {
        return false;
      }

      if (filterEstado && row.estado !== filterEstado) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        row.rbd,
        row.tipo_sesion,
        row.formato_planeado,
        row.lugar_tentativo,
        row.tematicas,
        row.estado,
        String(row.numero_sesion),
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [baseRows, filterEstado, filterTipo, searchQuery]);

  const monthDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Programacion[]>();
    rows.forEach((row) => {
      const current = map.get(row.fecha_programada) ?? [];
      current.push(row);
      map.set(row.fecha_programada, [...current].sort((left, right) => left.hora_programada.localeCompare(right.hora_programada)));
    });
    return map;
  }, [rows]);
  const selectedDateRows = sessionsByDate.get(selectedDate) ?? [];

  useEffect(() => {
    if (editingProgramacion) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      fecha_programada: selectedDate,
    }));
  }, [editingProgramacion, selectedDate]);

  useEffect(() => {
    async function resolveNumber() {
      if (!activeRbd || !form.fecha_programada) {
        setResolvedSessionNumber(null);
        setNumberError("Selecciona una escuela activa para programar sesiones.");
        return;
      }

      const editingKeepsNumber =
        editingProgramacion &&
        editingProgramacion.tipo_sesion === form.tipo_sesion &&
        editingProgramacion.fecha_programada.slice(0, 4) === form.fecha_programada.slice(0, 4);

      if (editingKeepsNumber) {
        setResolvedSessionNumber(editingProgramacion.numero_sesion);
        setNumberError(null);
        return;
      }

      setIsResolvingNumber(true);
      const { getNextSessionNumber } = await import("@/lib/supabase/queries");
      const result = await getNextSessionNumber(activeRbd, form.tipo_sesion, Number(form.fecha_programada.slice(0, 4)));
      setIsResolvingNumber(false);

      if (!result.value) {
        setResolvedSessionNumber(null);
        setNumberError(result.errorMessage ?? "No se pudo calcular el correlativo.");
        return;
      }

      setResolvedSessionNumber(result.value);
      setNumberError(null);
    }

    void resolveNumber();
  }, [activeRbd, editingProgramacion, form.fecha_programada, form.tipo_sesion]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton-shimmer h-20 rounded-[28px]" />
        <div className="skeleton-shimmer h-[360px] rounded-[28px]" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton-shimmer h-40 rounded-[24px]" />
          <div className="skeleton-shimmer h-40 rounded-[24px]" />
          <div className="skeleton-shimmer h-40 rounded-[24px]" />
        </div>
      </div>
    );
  }

  function resetCreateForm(nextDate = selectedDate) {
    setEditingProgramacion(null);
    setForm(makeEmptyForm(nextDate));
  }

  function handleDateSelection(dateValue: string) {
    setSelectedDate(dateValue);
    if (!editingProgramacion) {
      setForm((prev) => ({ ...prev, fecha_programada: dateValue }));
    }
  }

  function handleEditProgramacion(programacion: Programacion) {
    setEditingProgramacion(programacion);
    setSelectedDate(programacion.fecha_programada);
    setViewDate(fromDateInputValue(programacion.fecha_programada));
    setForm(programacionToForm(programacion));
  }

  async function handleSaveProgramacion() {
    if (!activeRbd) {
      toast("No hay una escuela activa para programar.", "error");
      return;
    }

    if (!form.fecha_programada || !form.hora_programada || !form.lugar_tentativo.trim() || !form.tematicas.trim()) {
      toast("Completa fecha, hora, lugar y temáticas.", "error");
      return;
    }

    if (!resolvedSessionNumber) {
      toast(numberError ?? "No se pudo calcular el correlativo de la sesión.", "error");
      return;
    }

    setIsSaving(true);
    const { createProgramacion, updateProgramacion } = await import("@/lib/supabase/queries");
    const mutation = editingProgramacion ? updateProgramacion : createProgramacion;
    const result = await mutation({
      id: editingProgramacion?.id,
      rbd: activeRbd,
      numero_sesion: resolvedSessionNumber,
      tipo_sesion: form.tipo_sesion,
      fecha_programada: form.fecha_programada,
      hora_programada: form.hora_programada,
      formato_planeado: form.formato_planeado,
      lugar_tentativo: form.lugar_tentativo.trim(),
      tematicas: form.tematicas.trim(),
      estado: "PROGRAMADA",
    });
    setIsSaving(false);

    if (!result.id) {
      toast(result.errorMessage ?? "No se pudo guardar la programación.", "error");
      return;
    }

    toast(
      editingProgramacion
        ? `Programación ${form.tipo_sesion.toLowerCase()} #${String(resolvedSessionNumber).padStart(2, "0")} actualizada.`
        : `Sesión ${form.tipo_sesion.toLowerCase()} #${String(resolvedSessionNumber).padStart(2, "0")} programada.`,
      "success",
    );
    resetCreateForm(form.fecha_programada);
    refresh();
  }

  async function handleCancelProgramacion() {
    if (!cancelTarget) {
      return;
    }

    setIsCancelling(true);
    const { cancelProgramacion } = await import("@/lib/supabase/queries");
    const result = await cancelProgramacion(cancelTarget.id);
    setIsCancelling(false);

    if (!result.ok) {
      toast(result.errorMessage ?? "No se pudo cancelar la programación.", "error");
      return;
    }

    toast(`Sesión ${cancelTarget.tipo_sesion.toLowerCase()} #${String(cancelTarget.numero_sesion).padStart(2, "0")} cancelada.`, "success");
    if (editingProgramacion?.id === cancelTarget.id) {
      resetCreateForm(cancelTarget.fecha_programada);
    }
    setCancelTarget(null);
    refresh();
  }

  async function handleDropProgramacion(targetDate: string) {
    if (!draggingProgramacionId) {
      return;
    }

    const programacion = baseRows.find((row) => row.id === draggingProgramacionId);
    setDragOverDate(null);
    setDraggingProgramacionId(null);

    if (!programacion || programacion.fecha_programada === targetDate) {
      return;
    }

    if (programacion.estado !== "PROGRAMADA" || programacion.acta_vinculada_id) {
      toast("Solo puedes reprogramar sesiones programadas y sin acta vinculada.", "error");
      return;
    }

    setIsReprogramming(true);
    const { updateProgramacion } = await import("@/lib/supabase/queries");
    const keepsNumber = programacion.fecha_programada.slice(0, 4) === targetDate.slice(0, 4);
    const result = await updateProgramacion({
      id: programacion.id,
      rbd: programacion.rbd,
      numero_sesion: keepsNumber ? programacion.numero_sesion : undefined,
      tipo_sesion: programacion.tipo_sesion,
      fecha_programada: targetDate,
      hora_programada: programacion.hora_programada,
      formato_planeado: programacion.formato_planeado,
      lugar_tentativo: programacion.lugar_tentativo,
      tematicas: programacion.tematicas,
      estado: programacion.estado,
    });
    setIsReprogramming(false);

    if (!result.id) {
      toast(result.errorMessage ?? "No se pudo reprogramar la sesión.", "error");
      return;
    }

    setSelectedDate(targetDate);
    setViewDate(fromDateInputValue(targetDate));
    toast(`Sesión ${programacion.tipo_sesion.toLowerCase()} #${String(programacion.numero_sesion).padStart(2, "0")} reprogramada al ${formatDate(targetDate)}.`, "success");
    refresh();
  }

  function handleOpenLinkedActa(programacion: Programacion) {
    if (!programacion.acta_vinculada_id) {
      return;
    }

    const linkedActa = snapshot.actas.find((acta) => acta.id === programacion.acta_vinculada_id) ?? null;

    if (!linkedActa) {
      toast("La sesión tiene un acta vinculada, pero no fue posible cargar su detalle.", "error");
      return;
    }

    setViewActa(linkedActa);
  }

  return (
    <div className="space-y-6">
      <DataBanner source={snapshot.source} status={status} reason={snapshot.reason} diagnostics={snapshot.diagnostics} />

      <SectionCard
        eyebrow="Planificación"
        title="Programación de sesiones"
        description="Programa, ajusta y ejecuta sesiones del consejo escolar desde el establecimiento activo."
      >
        <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">Calendario</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">
                  {new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(viewDate)}
                </h3>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" type="button" className="h-10 w-10 rounded-2xl px-0" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" type="button" className="h-10 w-10 rounded-2xl px-0" onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {weekDays.map((day) => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const dateKey = toDateInputValue(day);
                const dailyRows = sessionsByDate.get(dateKey) ?? [];
                const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                const isSelected = dateKey === selectedDate;

                return (
                  <div
                    key={dateKey}
                    onClick={() => handleDateSelection(dateKey)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggingProgramacionId) {
                        setDragOverDate(dateKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverDate === dateKey) {
                        setDragOverDate(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropProgramacion(dateKey);
                    }}
                    className={cn(
                      "min-h-[92px] cursor-pointer rounded-[22px] border px-2 py-3 text-left transition",
                      isSelected
                        ? "border-ocean bg-ocean/8 shadow-sm"
                        : "border-slate-200/80 bg-slate-50/45 hover:border-slate-300 hover:bg-white",
                      dragOverDate === dateKey && "border-amber-300 bg-amber-50 ring-2 ring-amber-200",
                      !isCurrentMonth && "opacity-45",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{day.getDate()}</span>
                      {dailyRows.length > 0 ? (
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">{dailyRows.length}</span>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1">
                      {dailyRows.slice(0, 2).map((row) => (
                        <div
                          key={row.id}
                          draggable={row.estado === "PROGRAMADA" && !row.acta_vinculada_id}
                          onDragStart={(event) => {
                            event.stopPropagation();
                            setDraggingProgramacionId(row.id);
                          }}
                          onDragEnd={() => {
                            setDraggingProgramacionId(null);
                            setDragOverDate(null);
                          }}
                          className={cn(
                            "truncate rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70",
                            row.estado === "PROGRAMADA" && !row.acta_vinculada_id && "cursor-grab active:cursor-grabbing",
                          )}
                        >
                          {row.tipo_sesion} #{row.numero_sesion}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">
                  {editingProgramacion ? "Editar sesión" : "Nueva sesión"}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{activeSchoolName}</h3>
                <p className="mt-1 text-sm text-slate-500">RBD {activeRbd ?? "sin selección"}</p>
              </div>
              {editingProgramacion ? (
                <Button variant="ghost" type="button" className="gap-2" onClick={() => resetCreateForm(selectedDate)}>
                  <XCircle className="h-4 w-4" />
                  Salir de edición
                </Button>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-ink">Tipo de sesión</span>
                  <select
                    value={form.tipo_sesion}
                    onChange={(event) => setForm((prev) => ({ ...prev, tipo_sesion: event.target.value as SessionType }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  >
                    {sessionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-ink">Formato</span>
                  <select
                    value={form.formato_planeado}
                    onChange={(event) => setForm((prev) => ({ ...prev, formato_planeado: event.target.value as SessionFormat }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  >
                    {sessionFormats.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-ink">Fecha</span>
                  <input
                    type="date"
                    value={form.fecha_programada}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, fecha_programada: event.target.value }));
                      setSelectedDate(event.target.value);
                    }}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span className="font-medium text-ink">Hora</span>
                  <input
                    type="time"
                    value={form.hora_programada}
                    onChange={(event) => setForm((prev) => ({ ...prev, hora_programada: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-ink">Lugar tentativo</span>
                <input
                  type="text"
                  value={form.lugar_tentativo}
                  onChange={(event) => setForm((prev) => ({ ...prev, lugar_tentativo: event.target.value }))}
                  placeholder="Ej. Biblioteca, sala de reuniones o enlace virtual"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-ink">Temáticas</span>
                <textarea
                  value={form.tematicas}
                  onChange={(event) => setForm((prev) => ({ ...prev, tematicas: event.target.value }))}
                  rows={4}
                  placeholder="Describe los temas principales a tratar en la sesión"
                  className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
                />
              </label>

              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-ocean" />
                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="font-semibold text-ink">
                      {isResolvingNumber
                        ? "Calculando correlativo..."
                        : resolvedSessionNumber
                          ? `${form.tipo_sesion} #${String(resolvedSessionNumber).padStart(2, "0")}`
                          : "Correlativo no disponible"}
                    </p>
                    <p>
                      La numeración se resuelve por establecimiento, tipo de sesión y año, considerando programaciones y actas ya registradas.
                    </p>
                    {numberError ? <p className="font-medium text-rose-600">{numberError}</p> : null}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => void handleSaveProgramacion()}
                disabled={isSaving || isResolvingNumber || !activeRbd || !!numberError}
              >
                {editingProgramacion ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isSaving ? "Guardando..." : editingProgramacion ? "Guardar cambios" : "Guardar programación"}
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-ocean" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Fecha seleccionada</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedDate ? formatDate(selectedDate) : "Sin fecha"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="h-4 w-4 text-ocean" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sesiones del día</p>
                <p className="mt-1 text-sm font-semibold text-ink">{selectedDateRows.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-ocean" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Escuela activa</p>
                <p className="mt-1 text-sm font-semibold text-ink">RBD {activeRbd ?? "sin selección"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_0.5fr_0.5fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por sesión, estado, lugar o temática"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
            />
          </label>
          <select
            value={filterTipo}
            onChange={(event) => setFilterTipo(event.target.value as SessionType | "")}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
          >
            <option value="">Todos los tipos</option>
            <option value="Ordinaria">Ordinaria</option>
            <option value="Extraordinaria">Extraordinaria</option>
          </select>
          <select
            value={filterEstado}
            onChange={(event) => setFilterEstado(event.target.value as PlanningStatus | "")}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
          >
            <option value="">Todos los estados</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="REALIZADA">Realizada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className="mb-6 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">Agenda diaria</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{formatDate(selectedDate)}</h3>
            </div>
            <Badge tone={selectedDateRows.length > 0 ? "success" : "neutral"}>
              {selectedDateRows.length} sesión{selectedDateRows.length === 1 ? "" : "es"}
            </Badge>
          </div>

          {draggingProgramacionId || isReprogramming ? (
            <p className="mt-3 text-sm text-slate-500">
              {isReprogramming ? "Reprogramando sesión..." : "Arrastra una sesión programada a otra fecha del calendario para reprogramarla visualmente."}
            </p>
          ) : null}

          {selectedDateRows.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {selectedDateRows.map((row) => (
                <div key={row.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50/65 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{row.tipo_sesion} #{String(row.numero_sesion).padStart(2, "0")}</p>
                        <Badge tone={row.estado === "PROGRAMADA" ? "success" : row.estado === "REALIZADA" ? "neutral" : "warn"}>
                          {row.estado}
                        </Badge>
                        {row.acta_vinculada_id ? <Badge tone="neutral">Acta vinculada</Badge> : null}
                      </div>
                      <p className="text-sm text-slate-600">{row.hora_programada} · {row.formato_planeado} · {row.lugar_tentativo}</p>
                      <p className="text-sm text-slate-500">{row.tematicas}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" type="button" className="gap-2" onClick={() => handleEditProgramacion(row)} disabled={Boolean(row.acta_vinculada_id)}>
                        <PencilLine className="h-4 w-4" />
                        Editar
                      </Button>
                      {row.acta_vinculada_id ? (
                        <Button variant="secondary" type="button" className="gap-2" onClick={() => handleOpenLinkedActa(row)}>
                          <FileText className="h-4 w-4" />
                          Ver acta
                        </Button>
                      ) : null}
                      <Button variant="secondary" type="button" className="gap-2" onClick={() => setActaProgramacion(row)} disabled={row.estado === "CANCELADA" || Boolean(row.acta_vinculada_id)}>
                        <FileText className="h-4 w-4" />
                        {row.acta_vinculada_id ? "Acta creada" : "Crear acta"}
                      </Button>
                      <Button variant="ghost" type="button" className="gap-2 text-rose-600 hover:text-rose-700" onClick={() => setCancelTarget(row)} disabled={row.estado === "CANCELADA" || Boolean(row.acta_vinculada_id)}>
                        <XCircle className="h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
              No hay sesiones programadas para este día.
            </div>
          )}
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Programaciones registradas
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/95 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Sesión</th>
                    <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Fecha</th>
                    <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Formato</th>
                    <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Estado</th>
                    <th className="sticky top-0 px-4 py-4 font-semibold backdrop-blur">Temáticas</th>
                    <th className="sticky top-0 px-4 py-4 font-semibold text-right backdrop-blur">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                  {rows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/45"}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-ink">{row.tipo_sesion} #{String(row.numero_sesion).padStart(2, "0")}</p>
                        <p className="text-xs text-slate-500">RBD {row.rbd}</p>
                      </td>
                      <td className="px-4 py-4">{formatDate(row.fecha_programada)} · {row.hora_programada}</td>
                      <td className="px-4 py-4">{row.formato_planeado}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={row.estado === "PROGRAMADA" ? "success" : row.estado === "REALIZADA" ? "neutral" : "warn"}>{row.estado}</Badge>
                          {row.acta_vinculada_id ? <Badge tone="neutral">Con acta</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">{row.tematicas}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditProgramacion(row)}
                            disabled={Boolean(row.acta_vinculada_id)}
                            className="rounded-full px-3 py-1 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Editar
                          </button>
                          {row.acta_vinculada_id ? (
                            <button
                              type="button"
                              onClick={() => handleOpenLinkedActa(row)}
                              className="rounded-full px-3 py-1 text-xs font-semibold text-ocean ring-1 ring-ocean/30 transition hover:bg-mist"
                            >
                              Ver acta
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setActaProgramacion(row)}
                            disabled={row.estado === "CANCELADA" || Boolean(row.acta_vinculada_id)}
                            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {row.acta_vinculada_id ? "Acta creada" : "Crear acta"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(row)}
                            disabled={row.estado === "CANCELADA" || Boolean(row.acta_vinculada_id)}
                            className="rounded-full px-3 py-1 text-xs font-semibold text-ember ring-1 ring-ember/30 transition hover:bg-ember/5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-600">
            Todavía no hay sesiones programadas para el establecimiento activo. Usa el calendario y el formulario para registrar la primera.
          </div>
        )}
      </SectionCard>

      <ActaForm
        isOpen={actaProgramacion !== null}
        onClose={() => setActaProgramacion(null)}
        establishments={snapshot.establishments}
        actas={snapshot.actas}
        initialProgramacion={actaProgramacion}
        onSaved={() => {
          setActaProgramacion(null);
          refresh();
        }}
      />

      {viewActa ? (
        <ActaDetail
          acta={viewActa}
          onClose={() => setViewActa(null)}
          establishments={snapshot.establishments}
        />
      ) : null}

      <ConfirmDialog
        open={cancelTarget !== null}
        title={`¿Cancelar sesión ${cancelTarget ? `${cancelTarget.tipo_sesion} #${String(cancelTarget.numero_sesion).padStart(2, "0")}` : ""}?`}
        description={
          cancelTarget
            ? `La programación del ${formatDate(cancelTarget.fecha_programada)} quedará marcada como CANCELADA y dejará de estar disponible para generar un acta desde esta vista.`
            : ""
        }
        confirmLabel={isCancelling ? "Cancelando..." : "Cancelar sesión"}
        tone="danger"
        onConfirm={() => void handleCancelProgramacion()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}