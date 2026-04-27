"use client";

import {
  useCallback,
  useState,
  useEffect,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/portal/confirm-dialog";
import { useSlepDirectorio } from "@/lib/supabase/use-slep-directorio";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import type { Acta, ActaRecordMode, AttendeeSlot, Establishment, SessionFormat, SessionType } from "@/types/domain";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTAMENTOS = [
  { key: "Director",   label: "Director(a)" },
  { key: "Sostenedor", label: "Representante Sostenedor" },
  { key: "Docente",    label: "Representante Docente" },
  { key: "Asistente",  label: "Representante Asistente de Educación" },
  { key: "Apoderado",  label: "Representante Apoderado" },
  { key: "Estudiante", label: "Representante Estudiante" },
] as const;

const SESSION_FORMATS: SessionFormat[] = ["Presencial", "Online", "Híbrido"];
const QUORUM_MIN = 4;
const DRAFT_KEY_PREFIX = "acta-draft";
// Minimum ms between consecutive saves (client-side rate limit) — #4
const SAVE_COOLDOWN_MS = 3000;

// ─── RUT helpers ──────────────────────────────────────────────────────────────

function calcDv(rutBody: string): string {
  let sum = 0;
  let multiplier = 2;

  for (let index = rutBody.length - 1; index >= 0; index -= 1) {
    sum += Number(rutBody[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

function isValidRut(raw: string): boolean {
  const cleaned = raw.replace(/[.\-]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  return calcDv(cleaned.slice(0, -1)) === cleaned.slice(-1);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getDraftStorageKey(actaId?: string | null): string {
  return `${DRAFT_KEY_PREFIX}:${actaId ?? "new"}`;
}

function getEstamentoValidationErrors(estamento: EstamentoState) {
  if (estamento.asistio !== true) {
    return { nombre: false, rut: false, correo: false, modalidad: false };
  }

  return {
    nombre: !sanitizeText(estamento.nombre),
    rut: !sanitizeText(estamento.rut) || !isValidRut(estamento.rut),
    correo: !sanitizeText(estamento.correo) || !isValidEmail(estamento.correo),
    modalidad: estamento.modalidad === null,
  };
}

function fmtRut(raw: string): string {
  const digits = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (digits.length < 2) return digits;
  const body = digits.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${digits.slice(-1)}`;
}

// Trim leading/trailing whitespace from text fields before persisting — #7
function sanitizeText(value: string): string {
  return value.trim();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EstamentoState {
  key: string;
  label: string;
  asistio: boolean | null;
  modalidad: "Presencial" | "Virtual" | null;
  nombre: string;
  rut: string;
  correo: string;
  expanded: boolean;
}

interface GuestRow {
  localId: string;
  nombre: string;
  cargo: string;
  correo: string;
}

interface FormState {
  id: string | null;
  id_programacion_origen: string | null;
  rbd: string;
  nombre_establecimiento: string;
  direccion: string;
  comuna: string;
  modo_registro: ActaRecordMode;
  tipo_sesion: SessionType;
  sesion: string;
  formato: SessionFormat;
  lugar: string;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  estamentos: EstamentoState[];
  showGuests: boolean;
  guests: GuestRow[];
  tabla_temas: string;
  desarrollo: string;
  acuerdos: string;
  varios: string;
  observacion_documental: string;
  proxima_sesion: string;
  link_acta: string;
}

type FormErrors = Partial<Record<
  "rbd" | "fecha" | "hora_inicio" | "hora_termino" | "tabla_temas" | "acuerdos" | "link_acta",
  string
>>;

export interface ActaFormProps {
  isOpen: boolean;
  onClose: () => void;
  establishments: Establishment[];
  actas: Acta[];
  editActa?: Acta | null;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEstamentos(existing?: AttendeeSlot[]): EstamentoState[] {
  return ESTAMENTOS.map(({ key, label }) => {
    const found = existing?.find((a) => a.rol === key);
    return {
      key,
      label,
      asistio: found != null ? found.asistio : null,
      modalidad: found?.modalidad ?? null,
      nombre: found?.nombre ?? "",
      rut: found?.rut ?? "",
      correo: found?.correo ?? "",
      expanded: found != null ? found.asistio : false,
    };
  });
}

function nextSessionNumber(actas: Acta[], rbd: string, tipo: SessionType): number {
  return actas.filter((a) => a.rbd === rbd && a.tipo_sesion === tipo).length + 1;
}

function makeEmptyForm(): FormState {
  return {
    id: null,
    id_programacion_origen: null,
    rbd: "",
    nombre_establecimiento: "",
    direccion: "",
    comuna: "",
    modo_registro: "ACTA_COMPLETA",
    tipo_sesion: "Ordinaria",
    sesion: "",
    formato: "Presencial",
    lugar: "",
    fecha: "",
    hora_inicio: "",
    hora_termino: "",
    estamentos: buildEstamentos(),
    showGuests: false,
    guests: [],
    tabla_temas: "",
    desarrollo: "",
    acuerdos: "",
    varios: "",
    observacion_documental: "",
    proxima_sesion: "",
    link_acta: "",
  };
}

function actaToForm(acta: Acta): FormState {
  return {
    id: acta.id,
    id_programacion_origen: null,
    rbd: acta.rbd,
    nombre_establecimiento: "",
    direccion: acta.direccion,
    comuna: acta.comuna,
    modo_registro: acta.modo_registro,
    tipo_sesion: acta.tipo_sesion,
    sesion: String(acta.sesion),
    formato: acta.formato,
    lugar: acta.lugar,
    fecha: acta.fecha,
    hora_inicio: acta.hora_inicio ?? "",
    hora_termino: acta.hora_termino ?? "",
    estamentos: buildEstamentos(acta.asistentes),
    showGuests: acta.invitados.length > 0,
    guests: acta.invitados.map((inv) => ({
      localId: inv.id,
      nombre: inv.nombre,
      cargo: inv.cargo,
      correo: "",
    })),
    tabla_temas: acta.tabla_temas,
    desarrollo: acta.desarrollo,
    acuerdos: acta.acuerdos,
    varios: acta.varios,
    observacion_documental: acta.observacion_documental,
    proxima_sesion: acta.proxima_sesion ?? "",
    link_acta: acta.link_acta ?? "",
  };
}

// Shallow comparison to detect dirty state — ignores estamentos.expanded which is pure UI — #25
function isFormDirty(a: FormState, b: FormState): boolean {
  const keys: (keyof FormState)[] = [
    "rbd", "modo_registro", "tipo_sesion", "formato", "lugar", "fecha",
    "hora_inicio", "hora_termino", "tabla_temas", "desarrollo",
    "acuerdos", "varios", "observacion_documental", "proxima_sesion", "link_acta",
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) return true;
  }
  // Check estamentos attendance
  for (let i = 0; i < a.estamentos.length; i++) {
    const ea = a.estamentos[i];
    const eb = b.estamentos[i];
    if (ea.asistio !== eb.asistio || ea.modalidad !== eb.modalidad || ea.nombre !== eb.nombre || ea.rut !== eb.rut || ea.correo !== eb.correo) return true;
  }
  // Check guests
  if (a.guests.length !== b.guests.length) return true;
  return false;
}

// ─── Primitive form field components ─────────────────────────────────────────

function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      {children}
      {required && <span className="ml-1 text-ember">*</span>}
    </label>
  );
}

function FormInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400",
        "focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20",
        "disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

function FormSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink",
        "focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function FormTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      className={cn(
        "mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400",
        "focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20",
        className,
      )}
      {...props}
    />
  );
}

// ─── EstamentoCard ────────────────────────────────────────────────────────────

interface EstamentoCardProps {
  state: EstamentoState;
  onChange: (updated: EstamentoState) => void;
}

function EstamentoCard({ state, onChange }: EstamentoCardProps) {
  const radioName = `asistio-${state.key}`;
  const modalidadName = `modalidad-${state.key}`;
  const fieldErrors = getEstamentoValidationErrors(state);

  function set<K extends keyof EstamentoState>(k: K, v: EstamentoState[K]) {
    onChange({ ...state, [k]: v });
  }

  function handleAsistioChange(value: boolean) {
    onChange({ ...state, asistio: value, expanded: true, modalidad: value ? state.modalidad : null });
  }

  const dotColor =
    state.asistio === true
      ? "bg-emerald-500"
      : state.asistio === false
        ? "bg-amber-400"
        : "bg-slate-300";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => set("expanded", !state.expanded)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className={cn("h-2 w-2 rounded-full", dotColor)} />
          <span className="text-sm font-semibold text-ink">{state.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {state.asistio === true && state.modalidad && (
            <span className="text-xs font-semibold text-emerald-600">{state.modalidad}</span>
          )}
          {state.asistio === false && (
            <span className="text-xs font-semibold text-amber-600">No asistió</span>
          )}
          {state.expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {state.expanded && (
        <div className="space-y-4 px-5 pb-5">
          {/* ¿Asistió? */}
          <div>
            <FormLabel>¿Asistió a la reunión?</FormLabel>
            <div className="mt-2 flex gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={radioName}
                  className="accent-ocean"
                  checked={state.asistio === true}
                  onChange={() => handleAsistioChange(true)}
                />
                <span>Sí</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={radioName}
                  className="accent-ocean"
                  checked={state.asistio === false}
                  onChange={() => handleAsistioChange(false)}
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* No asistió — confirmación visual */}
          {state.asistio === false && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Este representante <span className="font-semibold">no asistió</span> a la sesión.
            </div>
          )}

          {/* Sí asistió — modalidad y datos personales */}
          {state.asistio === true && (
            <>
              <div>
                <FormLabel required>Modalidad de asistencia</FormLabel>
                <div className="mt-2 flex gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={modalidadName}
                      className="accent-ocean"
                      checked={state.modalidad === "Presencial"}
                      onChange={() => set("modalidad", "Presencial")}
                    />
                    <span>Presencial</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={modalidadName}
                      className="accent-ocean"
                      checked={state.modalidad === "Virtual"}
                      onChange={() => set("modalidad", "Virtual")}
                    />
                    <span>Virtual</span>
                  </label>
                </div>
                {state.modalidad && (
                  <p className={cn(
                    "mt-2 text-xs font-semibold",
                    state.modalidad === "Presencial" ? "text-emerald-600" : "text-blue-600",
                  )}>
                    {state.modalidad === "Presencial"
                      ? "Asistió de forma presencial"
                      : "Asistió de forma virtual"}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FormLabel required>Nombre completo</FormLabel>
                  <FormInput
                    value={state.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    placeholder="Nombre y apellido"
                    className={cn(fieldErrors.nombre && "border-ember focus:ring-ember/20")}
                  />
                  {fieldErrors.nombre && (
                    <p className="mt-1 text-xs text-ember">El nombre es obligatorio.</p>
                  )}
                </div>

                <div>
                  <FormLabel required>RUT</FormLabel>
                  <FormInput
                    value={state.rut}
                    onChange={(e) => set("rut", fmtRut(e.target.value))}
                    placeholder="12.345.678-9"
                    className={cn(
                      fieldErrors.rut &&
                        "border-ember focus:ring-ember/20",
                    )}
                  />
                  {fieldErrors.rut && (
                    <p className="mt-1 text-xs text-ember">Ingresa un RUT válido.</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <FormLabel required>Correo electrónico</FormLabel>
                  <FormInput
                    type="email"
                    value={state.correo}
                    onChange={(e) => set("correo", e.target.value)}
                    placeholder="correo@ejemplo.cl"
                    className={cn(fieldErrors.correo && "border-ember focus:ring-ember/20")}
                  />
                  {fieldErrors.correo && (
                    <p className="mt-1 text-xs text-ember">Ingresa un correo electrónico válido.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── QuorumBadge ──────────────────────────────────────────────────────────────

function QuorumBadge({ presentCount }: { presentCount: number }) {
  const valid = presentCount >= QUORUM_MIN;
  return (
    <div
      aria-label={`${presentCount} de ${ESTAMENTOS.length} asistentes — ${valid ? "quórum válido" : "sin quórum"}`}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        valid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800",
      )}
    >
      <span>
        {presentCount}/{ESTAMENTOS.length}
      </span>
      <span>{valid ? "· Quórum válido" : "· Sin quórum"}</span>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-ocean">
      {children}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActaForm({
  isOpen,
  onClose,
  establishments,
  actas,
  editActa,
  onSaved,
}: ActaFormProps) {
  const { data: slepData, isLoading: slepLoading } = useSlepDirectorio();
  const { establishment, profile, selectedRbd } = usePortalAuth(); // used for RBD validation — #8
  const [form, setForm] = useState<FormState>(makeEmptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [fileReadyProgress, setFileReadyProgress] = useState(0);
  const [fileReadyStatus, setFileReadyStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false); // #25
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const initialFormRef = useRef<FormState | null>(null); // #25 dirty tracking
  const lastSaveTimeRef = useRef<number>(0); // #4 rate limit
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // #12
  const fileReadyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRbd = selectedRbd ?? profile?.rbd ?? null;
  const draftStorageKey = getDraftStorageKey(editActa?.id);

  function clearFileReadyFeedback() {
    if (fileReadyTimerRef.current) {
      clearInterval(fileReadyTimerRef.current);
      fileReadyTimerRef.current = null;
    }
  }

  function startFileReadyFeedback() {
    clearFileReadyFeedback();
    setFileReadyStatus("preparing");
    setFileReadyProgress(12);

    fileReadyTimerRef.current = setInterval(() => {
      setFileReadyProgress((current) => {
        const next = Math.min(current + 22, 100);
        if (next >= 100) {
          clearFileReadyFeedback();
          setFileReadyStatus("ready");
          return 100;
        }
        return next;
      });
    }, 90);
  }

  const buildActiveSchoolFormPatch = useCallback((rbd: string) => {
    const slep = slepData.find((item) => item.rbd === rbd);
    const est = establishments.find((item) => item.rbd === rbd) ?? (establishment?.rbd === rbd ? establishment : undefined);

    return {
      rbd,
      nombre_establecimiento: slep?.nombre_establecimiento ?? est?.nombre ?? "",
      direccion: est?.direccion ?? "",
      comuna: slep?.comuna ?? est?.comuna ?? "",
    };
  }, [establishment, establishments, slepData]);

  // Re-initialise whenever the drawer opens
  useEffect(() => {
    if (!isOpen) return;

    let initial: FormState;

    if (editActa) {
      initial = actaToForm(editActa);
      try {
        const saved = localStorage.getItem(draftStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as FormState;
          if (parsed.id === editActa.id) {
            initial = parsed;
          }
        }
      } catch {
        initial = actaToForm(editActa);
      }
    } else {
      // #12 — Try to restore a saved draft for new actas
      try {
        const saved = localStorage.getItem(draftStorageKey);
        initial = saved ? (JSON.parse(saved) as FormState) : makeEmptyForm();
        // Don't restore a draft that belongs to a different id (shouldn't happen but guard it)
        if (initial.id !== null) initial = makeEmptyForm();
      } catch {
        initial = makeEmptyForm();
      }

      if (activeRbd && !initial.rbd) {
        initial = {
          ...initial,
          ...buildActiveSchoolFormPatch(activeRbd),
          sesion: String(nextSessionNumber(actas, activeRbd, initial.tipo_sesion)),
        };
      }
    }

    setForm(initial);
    initialFormRef.current = initial; // snapshot for dirty check — #25
    setSubmitting(false);
    clearFileReadyFeedback();
    setFileReadyProgress(0);
    setFileReadyStatus("idle");
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrors({});
    setSaveError(null);
    pendingFile.current = null;
  }, [actas, activeRbd, buildActiveSchoolFormPatch, draftStorageKey, editActa, isOpen]);

  useEffect(() => {
    if (!isOpen || editActa || form.rbd || !activeRbd) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      ...buildActiveSchoolFormPatch(activeRbd),
      sesion: String(nextSessionNumber(actas, activeRbd, prev.tipo_sesion)),
    }));
  }, [actas, activeRbd, buildActiveSchoolFormPatch, editActa, form.rbd, isOpen]);

  // #12 — Persist acta drafts to localStorage (debounced 800 ms)
  useEffect(() => {
    if (!isOpen) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(form));
      } catch {
        // localStorage may be full or blocked — ignore silently
      }
    }, 800);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [draftStorageKey, form, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      const dirty = initialFormRef.current ? isFormDirty(form, initialFormRef.current) : false;
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form, isOpen]);

  useEffect(() => {
    return () => {
      clearFileReadyFeedback();
    };
  }, []);

  // ── Dirty-aware close — #25 ───────────────────────────────────────────────

  function requestClose() {
    const dirty = initialFormRef.current
      ? isFormDirty(form, initialFormRef.current)
      : false;

    if (dirty) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  }

  function forceClose() {
    setConfirmCloseOpen(false);
    onClose();
  }

  // ── Field helpers ────────────────────────────────────────────────────────

  function handleRbdChange(rbd: string) {
    const slep = slepData.find((e) => e.rbd === rbd);
    const est = establishments.find((e) => e.rbd === rbd);
    setForm((prev) => {
      const nextNum =
        !prev.id && rbd
          ? String(nextSessionNumber(actas, rbd, prev.tipo_sesion))
          : prev.sesion;
      return {
        ...prev,
        rbd,
        nombre_establecimiento: slep?.nombre_establecimiento ?? est?.nombre ?? "",
        direccion: est?.direccion ?? "",
        comuna: slep?.comuna ?? est?.comuna ?? "",
        sesion: nextNum,
      };
    });
  }

  function handleTipoSesionChange(tipo: SessionType) {
    setForm((prev) => ({
      ...prev,
      tipo_sesion: tipo,
      sesion:
        !prev.id && prev.rbd
          ? String(nextSessionNumber(actas, prev.rbd, tipo))
          : prev.sesion,
    }));
  }

  function updateEstamento(index: number, updated: EstamentoState) {
    setForm((prev) => {
      const estamentos = [...prev.estamentos];
      estamentos[index] = updated;
      return { ...prev, estamentos };
    });
  }

  function addGuest() {
    setForm((prev) => ({
      ...prev,
      guests: [
        ...prev.guests,
        { localId: crypto.randomUUID(), nombre: "", cargo: "", correo: "" },
      ],
    }));
  }

  function removeGuest(localId: string) {
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.localId !== localId),
    }));
  }

  function updateGuest(localId: string, field: keyof GuestRow, value: string) {
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.map((g) =>
        g.localId === localId ? { ...g, [field]: value } : g,
      ),
    }));
  }

  // ── File handling ────────────────────────────────────────────────────────

  function handleFileDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      pendingFile.current = file;
      setSaveError(null);
      setUploadProgress(0);
      setUploadStatus("idle");
      startFileReadyFeedback();
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      pendingFile.current = file;
      setSaveError(null);
      setUploadProgress(0);
      setUploadStatus("idle");
      startFileReadyFeedback();
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const presentCount = form.estamentos.filter((e) => e.asistio === true).length;
  const isDocumentalMode = form.modo_registro === "REGISTRO_DOCUMENTAL";

  // ── Validation ───────────────────────────────────────────────────────────

  function validate(draft: boolean): boolean {
    if (draft) return true;
    const next: FormErrors = {};
    const hasInvalidAttendees = form.estamentos.some((estamento) => {
      const fieldErrors = getEstamentoValidationErrors(estamento);
      return fieldErrors.nombre || fieldErrors.rut || fieldErrors.correo || fieldErrors.modalidad;
    });

    if (!form.rbd) next.rbd = "Selecciona un establecimiento.";
    if (!form.fecha) next.fecha = "La fecha es obligatoria.";
    if (!isDocumentalMode) {
      if (!form.hora_inicio) next.hora_inicio = "La hora de inicio es obligatoria.";
      if (!form.hora_termino) next.hora_termino = "La hora de término es obligatoria.";
      if (!form.tabla_temas.trim()) next.tabla_temas = "Completa la tabla de temas.";
      if (!form.acuerdos.trim()) next.acuerdos = "Completa los acuerdos.";
    }
    if (isDocumentalMode && !form.link_acta && !pendingFile.current) {
      next.link_acta = "Adjunta el PDF o documento de respaldo para registrar la sesión.";
    }

    setSaveError(
      hasInvalidAttendees
        ? "Completa nombre, modalidad, RUT válido y correo electrónico en todos los asistentes marcados como presentes."
        : null,
    );
    setErrors(next);
    return Object.keys(next).length === 0 && !hasInvalidAttendees;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(draft: boolean) {
    // #4 — Client-side rate limit: block if a save happened in the last 3 s
    const now = Date.now();
    if (now - lastSaveTimeRef.current < SAVE_COOLDOWN_MS) return;

    if (!validate(draft)) return;

    // #8 — Validate that a DIRECTOR is only saving actas for their own school
    if (profile?.rol === "DIRECTOR" && profile.rbd && form.rbd && form.rbd !== profile.rbd) {
      setSaveError("Solo puedes guardar actas de tu propio establecimiento.");
      return;
    }

    setSubmitting(true);
    setSaveError(null);

    const { upsertActa, replaceActaInvitados, uploadActaDocument, updateActaLink, deleteActaDocument } = await import(
      "@/lib/supabase/queries"
    );

    const isNewActa = !form.id;
    const generatedActaId = isNewActa ? crypto.randomUUID() : null;
    let documentUrl = form.link_acta || null;
    let shouldRollbackUploadedDocument = false;

    if (isDocumentalMode && pendingFile.current && !documentUrl) {
      if (!generatedActaId) {
        setSaveError("No se pudo preparar el identificador del registro documental.");
        setSubmitting(false);
        return;
      }

      setUploadStatus("uploading");
      const uploadedUrl = await uploadActaDocument(
        generatedActaId,
        form.rbd,
        pendingFile.current,
        (progress) => setUploadProgress(progress),
      );

      if (!uploadedUrl) {
        setUploadStatus("error");
        setSaveError("No se pudo subir el documento de respaldo. El registro documental requiere un archivo válido.");
        setSubmitting(false);
        return;
      }

      setUploadStatus("done");
      documentUrl = uploadedUrl;
      shouldRollbackUploadedDocument = true;
    }

    // #7 — Sanitize text fields before persisting
    const asistentes = form.estamentos
      .filter((e) => e.asistio !== null)
      .map((e) => ({
        rol: e.key,
        nombre: sanitizeText(e.nombre),
        rut: sanitizeText(e.rut),
        correo: sanitizeText(e.correo),
        asistio: e.asistio!,
        modalidad: e.modalidad ?? undefined,
      }));

    const { id: savedId, errorMessage } = await upsertActa({
      id: form.id ?? generatedActaId ?? undefined,
      programacion_origen_id: form.id_programacion_origen ?? undefined,
      rbd: form.rbd,
      sesion: Number(form.sesion) || 1,
      modo_registro: form.modo_registro,
      tipo_sesion: form.tipo_sesion,
      formato: form.formato,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio || null,
      hora_termino: form.hora_termino || null,
      lugar: sanitizeText(form.lugar),
      comuna: form.comuna,
      direccion: form.direccion,
      tabla_temas: sanitizeText(form.tabla_temas),
      desarrollo: sanitizeText(form.desarrollo),
      acuerdos: sanitizeText(form.acuerdos),
      varios: sanitizeText(form.varios),
      observacion_documental: sanitizeText(form.observacion_documental),
      proxima_sesion: form.proxima_sesion || null,
      link_acta: documentUrl,
      asistentes: isDocumentalMode ? [] : asistentes,
    });

    if (!savedId) {
      if (shouldRollbackUploadedDocument && generatedActaId && pendingFile.current) {
        await deleteActaDocument(generatedActaId, form.rbd, pendingFile.current.name);
      }

      setUploadStatus("error");
      setSaveError(
        errorMessage
          ? `No se pudo registrar la sesion en Supabase: ${errorMessage}`
          : "No se pudo registrar la sesion en Supabase.",
      );
      setSubmitting(false);
      return;
    }

    const invitadosResult = await replaceActaInvitados(
      savedId,
      isDocumentalMode
        ? []
        : form.guests.map((g) => ({ nombre: sanitizeText(g.nombre), cargo: sanitizeText(g.cargo) })),
    );

    if (!invitadosResult.ok) {
      setSaveError(
        invitadosResult.errorMessage
          ? `Se guardo la sesion, pero fallo la persistencia de invitados: ${invitadosResult.errorMessage}`
          : "Se guardo la sesion, pero fallo la persistencia de invitados.",
      );
      setSubmitting(false);
      return;
    }

    if (pendingFile.current && (!isDocumentalMode || form.link_acta)) {
      setUploadStatus("uploading");
      const url = await uploadActaDocument(
        savedId,
        form.rbd,
        pendingFile.current,
        (p) => setUploadProgress(p),
      );
      setUploadStatus(url ? "done" : "error");
      if (url) {
        const linkResult = await updateActaLink(savedId, url);
        if (!linkResult.ok) {
          setSaveError(
            linkResult.errorMessage
              ? `Se guardo la sesion, pero no se pudo actualizar el enlace del documento: ${linkResult.errorMessage}`
              : "Se guardo la sesion, pero no se pudo actualizar el enlace del documento.",
          );
          setSubmitting(false);
          return;
        }
      } else if (!isDocumentalMode) {
        setSaveError("Se guardo la sesion, pero no se pudo subir el documento de respaldo a Supabase Storage.");
        setSubmitting(false);
        return;
      }
    }

    // #4 — Record last save timestamp
    lastSaveTimeRef.current = Date.now();

    // #12 — Clear local draft after a successful save; the saved row becomes the continuation source.
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }

    // #23 — Show toast feedback
    toast(
      draft
        ? "Avance guardado correctamente."
        : isDocumentalMode
          ? "Registro documental guardado correctamente."
          : "Acta guardada correctamente.",
    );

    setSubmitting(false);
    onSaved();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          onClick={requestClose}
        />

        {/* Modal */}
        <aside className="relative flex w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl max-h-[92vh]">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ocean">
                {form.id ? "Editar acta" : "Nueva acta"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                {form.sesion
                  ? `Consejo Escolar ${form.tipo_sesion} N° ${String(form.sesion).padStart(2, "0")}`
                  : "Consejo Escolar"}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar formulario"
              onClick={requestClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">

            {/* ── 1. Información de la sesión ─────────────────────────────── */}
            <section>
              <SectionHeader>Información de la sesión</SectionHeader>
              <div className="grid gap-4 sm:grid-cols-2">

                {/* Establecimiento */}
                <div className="sm:col-span-2">
                  <FormLabel required>Establecimiento</FormLabel>
                  <FormSelect
                    value={form.rbd}
                    onChange={(e) => handleRbdChange(e.target.value)}
                    disabled={slepLoading}
                  >
                    <option value="">
                      {slepLoading ? "Cargando establecimientos…" : "— Selecciona un establecimiento —"}
                    </option>
                    {slepData.map((e) => (
                      <option key={e.rbd ?? ""} value={e.rbd ?? ""}>
                        {e.nombre_establecimiento}
                      </option>
                    ))}
                  </FormSelect>
                  {errors.rbd && (
                    <p className="mt-1 text-xs text-ember">{errors.rbd}</p>
                  )}
                </div>

                {/* Auto-filled read-only fields */}
                <div>
                  <FormLabel>RBD</FormLabel>
                  <FormInput value={form.rbd} disabled />
                </div>
                <div>
                  <FormLabel>Nombre del establecimiento</FormLabel>
                  <FormInput value={form.nombre_establecimiento} disabled />
                </div>
                <div>
                  <FormLabel>Comuna</FormLabel>
                  <FormInput value={form.comuna} disabled />
                </div>
                <div className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormInput value={form.direccion} disabled />
                </div>

                <div className="sm:col-span-2">
                  <FormLabel required>Modo de registro</FormLabel>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, modo_registro: "ACTA_COMPLETA" }))}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        form.modo_registro === "ACTA_COMPLETA"
                          ? "border-ocean bg-mist ring-2 ring-ocean/15"
                          : "border-slate-200 hover:border-ocean/40 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-sm font-semibold text-ink">Acta completa</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Usa el formulario habitual con asistencia, tabla y acuerdos.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, modo_registro: "REGISTRO_DOCUMENTAL" }))}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        form.modo_registro === "REGISTRO_DOCUMENTAL"
                          ? "border-ocean bg-mist ring-2 ring-ocean/15"
                          : "border-slate-200 hover:border-ocean/40 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-sm font-semibold text-ink">Registro documental</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Registra número de sesión y datos generales, adjuntando el acta en PDF.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Tipo de sesión */}
                <div>
                  <FormLabel required>Tipo de sesión</FormLabel>
                  <FormSelect
                    value={form.tipo_sesion}
                    onChange={(e) =>
                      handleTipoSesionChange(e.target.value as SessionType)
                    }
                  >
                    <option value="Ordinaria">Ordinaria</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                  </FormSelect>
                </div>

                {/* N° sesión — auto-calculado, sólo lectura */}
                <div>
                  <FormLabel required>N° de sesión</FormLabel>
                  <FormInput
                    type="number"
                    value={form.sesion}
                    disabled
                  />
                </div>

                {/* Formato */}
                <div>
                  <FormLabel required>Formato</FormLabel>
                  <FormSelect
                    value={form.formato}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        formato: e.target.value as SessionFormat,
                      }))
                    }
                  >
                    {SESSION_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </FormSelect>
                </div>

                {/* Lugar */}
                <div>
                  <FormLabel>Lugar</FormLabel>
                  <FormInput
                    value={form.lugar}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, lugar: e.target.value }))
                    }
                    placeholder="Ej: Biblioteca CRA"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <FormLabel required>Fecha</FormLabel>
                  <FormInput
                    type="date"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fecha: e.target.value }))
                    }
                  />
                  {errors.fecha && (
                    <p className="mt-1 text-xs text-ember">{errors.fecha}</p>
                  )}
                </div>

                {/* Hora inicio */}
                <div>
                  <FormLabel required={!isDocumentalMode}>Hora de inicio</FormLabel>
                  <FormInput
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hora_inicio: e.target.value,
                      }))
                    }
                  />
                  {errors.hora_inicio && (
                    <p className="mt-1 text-xs text-ember">{errors.hora_inicio}</p>
                  )}
                </div>

                {/* Hora término */}
                <div>
                  <FormLabel required={!isDocumentalMode}>Hora de término</FormLabel>
                  <FormInput
                    type="time"
                    value={form.hora_termino}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hora_termino: e.target.value,
                      }))
                    }
                  />
                  {errors.hora_termino && (
                    <p className="mt-1 text-xs text-ember">
                      {errors.hora_termino}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {isDocumentalMode ? (
              <section>
                <SectionHeader>Registro documental</SectionHeader>
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-600">
                    Este modo permite iniciar el correlativo y respaldo operativo sin completar el acta estructurada.
                  </p>
                  <div>
                    <FormLabel>Observación breve</FormLabel>
                    <FormTextarea
                      rows={4}
                      value={form.observacion_documental}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          observacion_documental: e.target.value,
                        }))
                      }
                      placeholder="Ej: Acta histórica ingresada para iniciar correlativo 2026. Pendiente sistematización completa."
                    />
                  </div>
                </div>
              </section>
            ) : (
              <>
                {/* ── 2. Asistencia estamental ─────────────────────────────────── */}
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <SectionHeader>Asistencia estamental</SectionHeader>
                    <QuorumBadge presentCount={presentCount} />
                  </div>
                  <div className="space-y-3">
                    {form.estamentos.map((est, index) => (
                      <EstamentoCard
                        key={est.key}
                        state={est}
                        onChange={(updated) => updateEstamento(index, updated)}
                      />
                    ))}
                  </div>
                </section>

                {/* ── 3. Invitados externos ────────────────────────────────────── */}
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <SectionHeader>Invitados externos</SectionHeader>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          showGuests: !prev.showGuests,
                        }))
                      }
                      className="text-xs font-semibold text-ocean hover:underline"
                    >
                      {form.showGuests ? "Ocultar sección" : "Agregar invitados"}
                    </button>
                  </div>

                  {form.showGuests && (
                    <div className="space-y-3">
                      {form.guests.map((guest) => (
                        <div
                          key={guest.localId}
                          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <div>
                            <FormLabel>Nombre</FormLabel>
                            <FormInput
                              value={guest.nombre}
                              onChange={(e) =>
                                updateGuest(guest.localId, "nombre", e.target.value)
                              }
                              placeholder="Nombre completo"
                            />
                          </div>
                          <div>
                            <FormLabel>Cargo / Rol</FormLabel>
                            <FormInput
                              value={guest.cargo}
                              onChange={(e) =>
                                updateGuest(guest.localId, "cargo", e.target.value)
                              }
                              placeholder="Ej: Encargada convivencia"
                            />
                          </div>
                          <div>
                            <FormLabel>Correo</FormLabel>
                            <FormInput
                              type="email"
                              value={guest.correo}
                              onChange={(e) =>
                                updateGuest(guest.localId, "correo", e.target.value)
                              }
                              placeholder="correo@ejemplo.cl"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeGuest(guest.localId)}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-ember transition hover:bg-ember/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addGuest}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ocean/40 px-4 py-2.5 text-sm font-semibold text-ocean transition hover:bg-mist"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar fila
                      </button>
                    </div>
                  )}
                </section>

                {/* ── 4. Desarrollo y acuerdos ─────────────────────────────────── */}
                <section>
                  <SectionHeader>Desarrollo y acuerdos</SectionHeader>
                  <div className="space-y-4">
                    <div>
                      <FormLabel required>Tabla de temas</FormLabel>
                      <FormTextarea
                        value={form.tabla_temas}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            tabla_temas: e.target.value,
                          }))
                        }
                        placeholder="1. Diagnóstico convivencia. 2. Resultados asistencia…"
                      />
                      {errors.tabla_temas && (
                        <p className="mt-1 text-xs text-ember">{errors.tabla_temas}</p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Desarrollo de la sesión</FormLabel>
                      <FormTextarea
                        rows={5}
                        value={form.desarrollo}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, desarrollo: e.target.value }))
                        }
                        placeholder="Descripción detallada del desarrollo de la sesión…"
                      />
                    </div>

                    <div>
                      <FormLabel required>Acuerdos y compromisos</FormLabel>
                      <FormTextarea
                        value={form.acuerdos}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, acuerdos: e.target.value }))
                        }
                        placeholder="Acuerdos alcanzados durante la sesión…"
                      />
                      {errors.acuerdos && (
                        <p className="mt-1 text-xs text-ember">{errors.acuerdos}</p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Varios</FormLabel>
                      <FormTextarea
                        rows={3}
                        value={form.varios}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, varios: e.target.value }))
                        }
                        placeholder="Observaciones adicionales…"
                      />
                    </div>

                    <div>
                      <FormLabel>Próxima sesión</FormLabel>
                      <FormInput
                        type="date"
                        value={form.proxima_sesion}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            proxima_sesion: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ── 5. Evidencia documental PDF ──────────────────────────────── */}
            {/* ── 5. Evidencia documental ──────────────────────────────────── */}
            <section>
              <SectionHeader>Evidencia documental</SectionHeader>
              {isDocumentalMode && (
                <p className="mb-3 text-sm text-slate-600">
                  En registro documental el archivo adjunto en Supabase Storage es obligatorio para abrir el correlativo operativo.
                </p>
              )}

              {form.link_acta ? (
                /* Existing document */
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-ink">
                      Documento cargado
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <a
                      href={form.link_acta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-ocean hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver documento
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, link_acta: "" }))
                      }
                      className="text-xs font-semibold text-ember hover:underline"
                    >
                      Reemplazar
                    </button>
                  </div>
                </div>
              ) : (
                /* Drop zone */
                <div>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) =>
                      e.key === "Enter" && fileInputRef.current?.click()
                    }
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      dragOver
                        ? "border-ocean bg-mist"
                        : "border-slate-200 bg-slate-50 hover:border-ocean/50 hover:bg-mist/50",
                    )}
                  >
                    <Upload
                      className={cn(
                        "h-8 w-8",
                        dragOver ? "text-ocean" : "text-slate-400",
                      )}
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {pendingFile.current
                          ? pendingFile.current.name
                          : "Arrastra el documento aquí o haz clic para seleccionar"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Cualquier tipo de documento o archivo de respaldo · máximo 10 MB
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  {(fileReadyStatus === "preparing" || fileReadyStatus === "ready") && uploadStatus !== "uploading" && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {fileReadyStatus === "preparing"
                            ? "Preparando documento en el formulario…"
                            : "Documento listo para guardar"}
                        </span>
                        <span>{fileReadyProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            fileReadyStatus === "ready" ? "bg-emerald-500" : "bg-ocean",
                          )}
                          style={{ width: `${fileReadyProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {uploadStatus === "uploading" && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Subiendo documento…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-ocean transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {uploadStatus === "done" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <FileCheck className="h-3.5 w-3.5" />
                      Documento subido correctamente.
                    </p>
                  )}

                  {fileReadyStatus === "ready" && uploadStatus === "idle" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <FileCheck className="h-3.5 w-3.5" />
                      Documento seleccionado y listo para guardarse en Supabase Storage.
                    </p>
                  )}

                  {uploadStatus === "error" && (
                    <p className="mt-2 text-xs text-ember">
                      {isDocumentalMode
                        ? "No se pudo subir el documento a Supabase Storage. El registro documental no fue guardado."
                        : "No se pudo subir el documento a Supabase Storage. El acta fue guardada sin actualizar la evidencia."}
                    </p>
                  )}

                  {errors.link_acta && (
                    <p className="mt-2 text-xs text-ember">{errors.link_acta}</p>
                  )}
                </div>
              )}
            </section>

            {/* Save error banner */}
            {saveError && (
              <div className="rounded-2xl border border-ember/30 bg-ember/5 px-5 py-4 text-sm text-ember">
                {saveError}
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200/80 bg-white px-6 py-4">
            <Button variant="ghost" onClick={requestClose} disabled={submitting}>
              Cancelar
            </Button>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                Guardar avance
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting
                  ? "Guardando…"
                  : isDocumentalMode
                    ? "Guardar registro documental"
                    : "Guardar acta final"}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* #25 — Confirm discard dialog */}
      <ConfirmDialog
        open={confirmCloseOpen}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar en el formulario. Si cierras ahora se perderán."
        confirmLabel="Descartar"
        tone="danger"
        onConfirm={forceClose}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </>
  );
}
