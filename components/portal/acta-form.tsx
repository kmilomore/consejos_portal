"use client";

import {
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
import type { Acta, AttendeeSlot, Establishment, SessionFormat, SessionType } from "@/types/domain";

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
const DRAFT_KEY = "acta-draft-new";
// Minimum ms between consecutive saves (client-side rate limit) — #4
const SAVE_COOLDOWN_MS = 3000;

// ─── RUT helpers ──────────────────────────────────────────────────────────────

function calcDv(rut: number): string {
  let M = 0;
  let S = 1;
  for (let T = rut; T; T = Math.trunc(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  return S ? String(S) : "k";
}

function isValidRut(raw: string): boolean {
  const cleaned = raw.replace(/[.\-]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  return calcDv(Number(cleaned.slice(0, -1))) === cleaned.slice(-1).toLowerCase();
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
  proxima_sesion: string;
  link_acta: string;
}

type FormErrors = Partial<Record<
  "rbd" | "fecha" | "hora_inicio" | "hora_termino" | "tabla_temas" | "acuerdos",
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
      nombre: found?.nombre ?? "",
      rut: "",
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
    tipo_sesion: acta.tipo_sesion,
    sesion: String(acta.sesion),
    formato: acta.formato,
    lugar: acta.lugar,
    fecha: acta.fecha,
    hora_inicio: acta.hora_inicio,
    hora_termino: acta.hora_termino,
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
    proxima_sesion: acta.proxima_sesion ?? "",
    link_acta: acta.link_acta ?? "",
  };
}

// Shallow comparison to detect dirty state — ignores estamentos.expanded which is pure UI — #25
function isFormDirty(a: FormState, b: FormState): boolean {
  const keys: (keyof FormState)[] = [
    "rbd", "tipo_sesion", "formato", "lugar", "fecha",
    "hora_inicio", "hora_termino", "tabla_temas", "desarrollo",
    "acuerdos", "varios", "proxima_sesion",
  ];
  for (const key of keys) {
    if (a[key] !== b[key]) return true;
  }
  // Check estamentos attendance
  for (let i = 0; i < a.estamentos.length; i++) {
    const ea = a.estamentos[i];
    const eb = b.estamentos[i];
    if (ea.asistio !== eb.asistio || ea.nombre !== eb.nombre || ea.correo !== eb.correo) return true;
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
  const showRut = state.key === "Apoderado";

  function set<K extends keyof EstamentoState>(k: K, v: EstamentoState[K]) {
    onChange({ ...state, [k]: v });
  }

  function handleAsistioChange(value: boolean) {
    onChange({ ...state, asistio: value, expanded: true });
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
        {state.expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
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

          {/* Personal data — only shown when attended */}
          {state.asistio === true && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel required>Nombre completo</FormLabel>
                <FormInput
                  value={state.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Nombre y apellido"
                />
              </div>

              {showRut && (
                <div>
                  <FormLabel>RUT</FormLabel>
                  <FormInput
                    value={state.rut}
                    onChange={(e) => set("rut", fmtRut(e.target.value))}
                    placeholder="12.345.678-9"
                    className={cn(
                      state.rut && !isValidRut(state.rut) &&
                        "border-ember focus:ring-ember/20",
                    )}
                  />
                  {state.rut && !isValidRut(state.rut) && (
                    <p className="mt-1 text-xs text-ember">RUT inválido</p>
                  )}
                </div>
              )}

              <div className={cn(!showRut && "sm:col-span-2")}>
                <FormLabel>Correo electrónico</FormLabel>
                <FormInput
                  type="email"
                  value={state.correo}
                  onChange={(e) => set("correo", e.target.value)}
                  placeholder="correo@ejemplo.cl"
                />
              </div>
            </div>
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
  const { profile } = usePortalAuth(); // used for RBD validation — #8
  const [form, setForm] = useState<FormState>(makeEmptyForm);
  const [submitting, setSubmitting] = useState(false);
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

  // Re-initialise whenever the drawer opens
  useEffect(() => {
    if (!isOpen) return;

    let initial: FormState;

    if (editActa) {
      initial = actaToForm(editActa);
    } else {
      // #12 — Try to restore a saved draft for new actas
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        initial = saved ? (JSON.parse(saved) as FormState) : makeEmptyForm();
        // Don't restore a draft that belongs to a different id (shouldn't happen but guard it)
        if (initial.id !== null) initial = makeEmptyForm();
      } catch {
        initial = makeEmptyForm();
      }
    }

    setForm(initial);
    initialFormRef.current = initial; // snapshot for dirty check — #25
    setSubmitting(false);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrors({});
    setSaveError(null);
    pendingFile.current = null;
  }, [isOpen, editActa]);

  // #12 — Persist new-acta drafts to localStorage (debounced 800 ms)
  useEffect(() => {
    if (!isOpen || editActa) return; // only for new actas
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // localStorage may be full or blocked — ignore silently
      }
    }, 800);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [form, isOpen, editActa]);

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
    if (file?.type === "application/pdf") {
      pendingFile.current = file;
      setUploadStatus("idle");
    }
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      pendingFile.current = file;
      setUploadStatus("idle");
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const presentCount = form.estamentos.filter((e) => e.asistio === true).length;

  // ── Validation ───────────────────────────────────────────────────────────

  function validate(draft: boolean): boolean {
    if (draft) return true;
    const next: FormErrors = {};
    if (!form.rbd) next.rbd = "Selecciona un establecimiento.";
    if (!form.fecha) next.fecha = "La fecha es obligatoria.";
    if (!form.hora_inicio) next.hora_inicio = "La hora de inicio es obligatoria.";
    if (!form.hora_termino) next.hora_termino = "La hora de término es obligatoria.";
    if (!form.tabla_temas.trim()) next.tabla_temas = "Completa la tabla de temas.";
    if (!form.acuerdos.trim()) next.acuerdos = "Completa los acuerdos.";
    setErrors(next);
    return Object.keys(next).length === 0;
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

    const { upsertActa, replaceActaInvitados, uploadActaPdf } = await import(
      "@/lib/supabase/queries"
    );

    // #7 — Sanitize text fields before persisting
    const asistentes = form.estamentos
      .filter((e) => e.asistio !== null)
      .map((e) => ({
        rol: e.key,
        nombre: sanitizeText(e.nombre),
        correo: sanitizeText(e.correo),
        asistio: e.asistio!,
      }));

    const savedId = await upsertActa({
      id: form.id ?? undefined,
      programacion_origen_id: form.id_programacion_origen ?? undefined,
      rbd: form.rbd,
      sesion: Number(form.sesion) || 1,
      tipo_sesion: form.tipo_sesion,
      formato: form.formato,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_termino: form.hora_termino,
      lugar: sanitizeText(form.lugar),
      comuna: form.comuna,
      direccion: form.direccion,
      tabla_temas: sanitizeText(form.tabla_temas),
      desarrollo: sanitizeText(form.desarrollo),
      acuerdos: sanitizeText(form.acuerdos),
      varios: sanitizeText(form.varios),
      proxima_sesion: form.proxima_sesion || null,
      link_acta: form.link_acta || null,
      asistentes,
    });

    if (!savedId) {
      setSaveError("No se pudo guardar el acta. Revisa la conexión con Supabase.");
      setSubmitting(false);
      return;
    }

    await replaceActaInvitados(
      savedId,
      form.guests.map((g) => ({ nombre: sanitizeText(g.nombre), cargo: sanitizeText(g.cargo) })),
    );

    if (pendingFile.current) {
      setUploadStatus("uploading");
      const url = await uploadActaPdf(
        savedId,
        form.rbd,
        pendingFile.current,
        (p) => setUploadProgress(p),
      );
      setUploadStatus(url ? "done" : "error");
    }

    // #4 — Record last save timestamp
    lastSaveTimeRef.current = Date.now();

    // #12 — Clear draft from localStorage after a successful save
    if (!editActa) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
    }

    // #23 — Show toast feedback
    toast(draft ? "Avance guardado correctamente." : "Acta guardada correctamente.");

    setSubmitting(false);
    onSaved();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          onClick={requestClose}
        />

        {/* Drawer */}
        <aside className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-panel">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ocean">
                {form.id ? "Editar acta" : "Nueva acta"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink">
                {form.nombre_establecimiento || "Consejo Escolar"}
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
                        {e.nombre_establecimiento} ({e.rbd})
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
                  <FormLabel>Comuna</FormLabel>
                  <FormInput value={form.comuna} disabled />
                </div>
                <div className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormInput value={form.direccion} disabled />
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
                  <FormLabel required>Hora de inicio</FormLabel>
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
                  <FormLabel required>Hora de término</FormLabel>
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

            {/* ── 5. Evidencia documental PDF ──────────────────────────────── */}
            <section>
              <SectionHeader>Evidencia documental (PDF)</SectionHeader>

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
                          : "Arrastra el PDF aquí o haz clic para seleccionar"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Solo archivos PDF · máximo 10 MB
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInput}
                  />

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

                  {uploadStatus === "error" && (
                    <p className="mt-2 text-xs text-ember">
                      Error al subir el documento. El acta fue guardada sin
                      evidencia.
                    </p>
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
                {submitting ? "Guardando…" : "Guardar acta final"}
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
