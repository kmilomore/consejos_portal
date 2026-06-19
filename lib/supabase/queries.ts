import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEYS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/database.types";
import type {
  Acta,
  ActaRecordMode,
  AttendeeSlot,
  Establishment,
  ExtraordinarySessionReason,
  InvitedGuest,
  LogEntry,
  PortalAccessAuditEntry,
  PortalAccessAuditSnapshot,
  PortalManagedAccessRole,
  PortalUserAccess,
  Programacion,
  SessionFormat,
  SuspensionClassDetail,
  SessionType,
} from "@/types/domain";

export type PortalDataSource = "supabase" | "mock";

export interface PortalDiagnostic {
  scope: string;
  status: "ok" | "empty" | "error" | "info";
  message: string;
}

export interface PortalSnapshot {
  establishments: Establishment[];
  programaciones: Programacion[];
  actas: Acta[];
  extraordinarySessionReasons: ExtraordinarySessionReason[];
  attendanceByRole: Array<{ rol: string; ratio: number }>;
  planningByComuna: Array<{ comuna: string; total: number }>;
  actasByMode: { completas: number; documentales: number };
  source: PortalDataSource;
  reason?: string;
  diagnostics: PortalDiagnostic[];
}

export interface ActaMutationResult {
  id: string | null;
  errorMessage?: string;
}

export interface PersistenceStepResult {
  ok: boolean;
  errorMessage?: string;
}

export interface PortalUserAccessUpsertInput {
  correo_electronico: string;
  rbd: string | null;
  rol: PortalManagedAccessRole;
  equipo?: string;
  origen?: string;
  metadata?: Record<string, unknown>;
}

export interface ProgramacionUpsertInput {
  id?: string;
  rbd: string;
  numero_sesion?: number;
  tipo_sesion: SessionType;
  fecha_programada: string;
  hora_programada: string;
  formato_planeado: SessionFormat;
  lugar_tentativo: string;
  tematicas: string;
  estado?: Programacion["estado"];
}

type ActaRow = Omit<Acta, "asistentes" | "invitados" | "suspension_clases_detalle"> & {
  asistentes: unknown;
  suspension_clases_detalle: unknown;
};

type ExtraordinarySessionReasonRow = {
  id: string;
  nombre: string;
};

type InvitadoRow = {
  id: string;
  acta_id: string;
  nombre: string;
  cargo: string;
};

type PortalUserAccessRow = {
  id: string;
  correo_electronico: string;
  email_normalizado: string;
  rbd: string | null;
  rol: string;
  equipo: string;
  origen: string;
  metadata: Json;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

type PortalAccessAuditRow = {
  id: string;
  access_id: string;
  admin_email: string;
  accion: PortalAccessAuditEntry["accion"];
  snapshot_antes: Json | null;
  snapshot_despues: Json | null;
  created_at: string;
};

type LogEntryRow = {
  id: string;
  usuario: string;
  rbd: string;
  accion: LogEntry["accion"];
  detalle: string;
  vista_origen: string;
  created_at: string;
};

const roleOrder = ["Director", "Sostenedor", "Docente", "Asistente", "Estudiante", "Apoderado"];

function maskEmail(email: string | null | undefined) {
  if (!email) return null;

  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  if (localPart.length <= 2) return `${localPart[0] ?? "*"}***@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAccessMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function normalizePortalAccessAuditSnapshot(value: unknown): PortalAccessAuditSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const correoElectronico = typeof value.correo_electronico === "string" ? value.correo_electronico : "";
  const emailNormalizado = typeof value.email_normalizado === "string" ? value.email_normalizado : "";
  const rol = typeof value.rol === "string" ? value.rol : "";
  const equipo = typeof value.equipo === "string" ? value.equipo : "";
  const origen = typeof value.origen === "string" ? value.origen : "";

  if (!correoElectronico || !emailNormalizado || !rol) {
    return null;
  }

  return {
    correo_electronico: correoElectronico,
    email_normalizado: emailNormalizado,
    rbd: typeof value.rbd === "string" ? value.rbd : null,
    rol,
    equipo,
    origen,
    metadata: normalizeAccessMetadata(value.metadata),
    activo: typeof value.activo === "boolean" ? value.activo : false,
  };
}

function normalizePortalUserAccess(row: PortalUserAccessRow): PortalUserAccess {
  return {
    id: row.id,
    correo_electronico: row.correo_electronico,
    email_normalizado: row.email_normalizado,
    rbd: row.rbd,
    rol: row.rol,
    equipo: row.equipo,
    origen: row.origen,
    metadata: normalizeAccessMetadata(row.metadata),
    activo: row.activo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizePortalAccessAudit(row: PortalAccessAuditRow): PortalAccessAuditEntry {
  return {
    id: row.id,
    access_id: row.access_id,
    admin_email: row.admin_email,
    accion: row.accion,
    snapshot_antes: normalizePortalAccessAuditSnapshot(row.snapshot_antes),
    snapshot_despues: normalizePortalAccessAuditSnapshot(row.snapshot_despues),
    created_at: row.created_at,
  };
}

function normalizeLogEntry(row: LogEntryRow): LogEntry {
  return {
    id: row.id,
    usuario: row.usuario,
    rbd: row.rbd,
    accion: row.accion,
    detalle: row.detalle,
    vista_origen: row.vista_origen,
    created_at: row.created_at,
  };
}

function humanizeUserAccessError(message: string) {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return "No fue posible gestionar el acceso del usuario.";
  }

  if (normalized.includes("solo un administrador global")) {
    return "Solo un administrador global puede gestionar usuarios desde este panel.";
  }

  if (normalized.includes("duplicate key") || normalized.includes("unique_scope")) {
    return "Ya existe una asignación activa con ese correo, rol, equipo y escuela.";
  }

  if (normalized.includes("correo valido")) {
    return "Debes ingresar un correo válido.";
  }

  if (normalized.includes("rbd valido")) {
    return "Debes seleccionar una escuela válida para ese rol.";
  }

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "Tu sesión no tiene permisos para gestionar usuarios.";
  }

  return message;
}

function humanizeAuditError(message: string) {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return "No fue posible cargar la auditoría del portal.";
  }

  if (normalized.includes("portal_access_audit") || normalized.includes("does not exist")) {
    return "La migración de auditoría aún no está aplicada en Supabase.";
  }

  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "Tu sesión no tiene permisos para ver la auditoría del portal.";
  }

  return message;
}

function normalizeActaMode(value: unknown): ActaRecordMode {
  return value === "REGISTRO_DOCUMENTAL" ? "REGISTRO_DOCUMENTAL" : "ACTA_COMPLETA";
}

function normalizeAsistentes(value: unknown): AttendeeSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const rol = typeof item.rol === "string" ? item.rol : null;
    const nombre = typeof item.nombre === "string" ? item.nombre : "";
    const rut = typeof item.rut === "string" ? item.rut : "";
    const correo = typeof item.correo === "string" ? item.correo : "";
    const asistio = typeof item.asistio === "boolean" ? item.asistio : false;
    const modalidad =
      item.modalidad === "Presencial" || item.modalidad === "Virtual"
        ? item.modalidad
        : undefined;

    if (!rol) {
      return [];
    }

    return [{ rol, nombre, rut, correo, asistio, modalidad }];
  });
}

function normalizeSuspensionClassesDetail(value: unknown): SuspensionClassDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const fechaSuspension = typeof item.fecha_suspension === "string" ? item.fecha_suspension : "";
    const fechaRecuperacion = typeof item.fecha_recuperacion === "string" ? item.fecha_recuperacion : "";
    const tipoJornada =
      item.tipo_jornada === "Con JEC" || item.tipo_jornada === "Sin JEC" || item.tipo_jornada === "Educación de adulto"
        ? item.tipo_jornada
        : null;

    if (!fechaSuspension || !fechaRecuperacion || !tipoJornada) {
      return [];
    }

    return [{
      fecha_suspension: fechaSuspension,
      fecha_recuperacion: fechaRecuperacion,
      tipo_jornada: tipoJornada,
    }];
  });
}

function sortProgramaciones(rows: Programacion[]) {
  return [...rows].sort((left, right) => left.fecha_programada.localeCompare(right.fecha_programada));
}

function sortActas(rows: Acta[]) {
  return [...rows].sort((left, right) => right.fecha.localeCompare(left.fecha));
}

function buildAttendanceByRole(actas: Acta[]) {
  if (actas.length === 0) {
    return [];
  }

  const stats = new Map<string, { present: number; total: number }>();

  actas.forEach((acta) => {
    acta.asistentes.forEach((asistente) => {
      const current = stats.get(asistente.rol) ?? { present: 0, total: 0 };
      current.total += 1;
      if (asistente.asistio) {
        current.present += 1;
      }
      stats.set(asistente.rol, current);
    });
  });

  return [...stats.entries()]
    .map(([rol, values]) => ({
      rol,
      ratio: values.total === 0 ? 0 : values.present / values.total,
    }))
    .sort((left, right) => {
      const leftIndex = roleOrder.indexOf(left.rol);
      const rightIndex = roleOrder.indexOf(right.rol);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight || left.rol.localeCompare(right.rol);
    });
}

function buildPlanningByComuna(programaciones: Programacion[], establishments: Establishment[]) {
  if (programaciones.length === 0 || establishments.length === 0) {
    return [];
  }

  const comunaByRbd = new Map(establishments.map((item) => [item.rbd, item.comuna]));
  const totals = new Map<string, number>();

  programaciones.forEach((item) => {
    const comuna = comunaByRbd.get(item.rbd) ?? "Sin comuna";
    totals.set(comuna, (totals.get(comuna) ?? 0) + 1);
  });

  return [...totals.entries()]
    .map(([comuna, total]) => ({ comuna, total }))
    .sort((left, right) => right.total - left.total || left.comuna.localeCompare(right.comuna));
}

function buildActasByMode(actas: Acta[]) {
  return {
    completas: actas.filter((acta) => acta.modo_registro === "ACTA_COMPLETA").length,
    documentales: actas.filter((acta) => acta.modo_registro === "REGISTRO_DOCUMENTAL").length,
  };
}

function getMockPortalSnapshot(reason?: string, diagnostics: PortalDiagnostic[] = []): PortalSnapshot {
  return {
    establishments: [],
    programaciones: [],
    actas: [],
    extraordinarySessionReasons: [],
    attendanceByRole: [],
    planningByComuna: [],
    actasByMode: { completas: 0, documentales: 0 },
    source: "mock",
    reason,
    diagnostics,
  };
}

function buildQueryDiagnostic(scope: string, rowCount: number, errorMessage?: string): PortalDiagnostic {
  if (errorMessage) {
    return {
      scope,
      status: "error",
      message: errorMessage,
    };
  }

  if (rowCount === 0) {
    return {
      scope,
      status: "empty",
      message: "La consulta respondió sin filas visibles.",
    };
  }

  return {
    scope,
    status: "ok",
    message: `${rowCount} registro${rowCount === 1 ? "" : "s"} visible${rowCount === 1 ? "" : "s"}.`,
  };
}

export function readPortalSnapshotVersion(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEYS.SNAPSHOT_VERSION);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function bumpPortalSnapshotVersion() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEYS.SNAPSHOT_VERSION, String(Date.now()));
}

export async function getNextSessionNumber(
  establishmentRbd: string,
  sessionType: SessionType,
  targetYear: number,
): Promise<{ value: number | null; errorMessage?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { value: null, errorMessage: "Cliente Supabase no disponible." };
  }

  const { data, error } = await supabase.rpc("get_next_session_number", {
    establishment_rbd: establishmentRbd,
    session_type: sessionType,
    target_year: targetYear,
  });

  if (error) {
    return { value: null, errorMessage: error.message };
  }

  return { value: typeof data === "number" ? data : Number(data) };
}

export async function createProgramacion(input: ProgramacionUpsertInput): Promise<ActaMutationResult> {
  const supabase = createClient();
  if (!supabase) {
    return { id: null, errorMessage: "Cliente Supabase no disponible." };
  }

  const targetYear = Number(input.fecha_programada.slice(0, 4));
  const nextSessionResult = await getNextSessionNumber(input.rbd, input.tipo_sesion, targetYear);

  if (!nextSessionResult.value) {
    return { id: null, errorMessage: nextSessionResult.errorMessage ?? "No fue posible calcular el número de sesión." };
  }

  const payload = {
    id: input.id,
    rbd: input.rbd,
    tipo_sesion: input.tipo_sesion,
    numero_sesion: nextSessionResult.value,
    fecha_programada: input.fecha_programada,
    hora_programada: input.hora_programada,
    formato_planeado: input.formato_planeado,
    lugar_tentativo: input.lugar_tentativo,
    tematicas: input.tematicas,
    estado: input.estado ?? "PROGRAMADA",
  };

  const { data, error } = await supabase
    .from("programacion")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { id: null, errorMessage: error.message };
  }

  bumpPortalSnapshotVersion();

  return { id: (data as { id: string }).id };
}

export async function updateProgramacion(input: ProgramacionUpsertInput): Promise<ActaMutationResult> {
  const supabase = createClient();
  if (!supabase) {
    return { id: null, errorMessage: "Cliente Supabase no disponible." };
  }

  if (!input.id) {
    return { id: null, errorMessage: "Falta el identificador de la programación a editar." };
  }

  const targetYear = Number(input.fecha_programada.slice(0, 4));
  let numeroSesion = input.numero_sesion ?? null;

  if (!numeroSesion) {
    const nextSessionResult = await getNextSessionNumber(input.rbd, input.tipo_sesion, targetYear);
    if (!nextSessionResult.value) {
      return { id: null, errorMessage: nextSessionResult.errorMessage ?? "No fue posible calcular el número de sesión." };
    }
    numeroSesion = nextSessionResult.value;
  }

  const { error } = await supabase
    .from("programacion")
    .update({
      rbd: input.rbd,
      tipo_sesion: input.tipo_sesion,
      numero_sesion: numeroSesion,
      fecha_programada: input.fecha_programada,
      hora_programada: input.hora_programada,
      formato_planeado: input.formato_planeado,
      lugar_tentativo: input.lugar_tentativo,
      tematicas: input.tematicas,
      estado: input.estado ?? "PROGRAMADA",
    })
    .eq("id", input.id);

  if (error) {
    return { id: null, errorMessage: error.message };
  }

  bumpPortalSnapshotVersion();

  return { id: input.id };
}

export async function cancelProgramacion(programacionId: string): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, errorMessage: "Cliente Supabase no disponible." };
  }

  const { error } = await supabase
    .from("programacion")
    .update({ estado: "CANCELADA" })
    .eq("id", programacionId);

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  bumpPortalSnapshotVersion();

  return { ok: true };
}

export interface ActaUpsertInput {
  id?: string;
  programacion_origen_id?: string;
  rbd: string;
  sesion: number;
  modo_registro: ActaRecordMode;
  tipo_sesion: SessionType;
  formato: SessionFormat;
  fecha: string;
  hora_inicio: string | null;
  hora_termino: string | null;
  lugar: string;
  comuna: string;
  direccion: string;
  tabla_temas: string;
  desarrollo: string;
  acuerdos: string;
  varios: string;
  observacion_documental: string;
  motivo_extraordinaria_id: string | null;
  motivo_extraordinaria: string | null;
  suspension_clases_detalle: SuspensionClassDetail[] | null;
  proxima_sesion: string | null;
  link_acta: string | null;
  asistentes: AttendeeSlot[];
}

function buildActaDocumentPath(actaId: string, rbd: string, fileName: string, actaYear: number): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "pdf";
  return `${rbd.replace(/\//g, "-")}/${actaYear}/${actaId}.${ext}`;
}

export async function upsertActa(input: ActaUpsertInput): Promise<ActaMutationResult> {
  const supabase = createClient();
  if (!supabase) return { id: null, errorMessage: "Cliente Supabase no disponible." };

  const payload = {
    id: input.id,
    programacion_origen_id: input.programacion_origen_id ?? null,
    rbd: input.rbd,
    sesion: input.sesion,
    modo_registro: input.modo_registro,
    tipo_sesion: input.tipo_sesion,
    formato: input.formato,
    fecha: input.fecha,
    hora_inicio: input.hora_inicio,
    hora_termino: input.hora_termino,
    lugar: input.lugar,
    comuna: input.comuna,
    direccion: input.direccion,
    tabla_temas: input.tabla_temas,
    desarrollo: input.desarrollo,
    acuerdos: input.acuerdos,
    varios: input.varios,
    observacion_documental: input.observacion_documental,
    motivo_extraordinaria_id: input.tipo_sesion === "Extraordinaria" ? input.motivo_extraordinaria_id : null,
    motivo_extraordinaria: input.tipo_sesion === "Extraordinaria" ? input.motivo_extraordinaria : null,
    suspension_clases_detalle: input.suspension_clases_detalle as unknown as Json,
    proxima_sesion: input.proxima_sesion,
    link_acta: input.link_acta,
    asistentes: input.asistentes as unknown as Json,
  };

  const { data, error } = await supabase
    .from("actas")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    logger.error("upsertActa", error.message);
    return { id: null, errorMessage: error.message };
  }

  const savedId = (data as { id: string }).id;

  if (input.programacion_origen_id) {
    const { error: programacionError } = await supabase
      .from("programacion")
      .update({ acta_vinculada_id: savedId, estado: "REALIZADA" })
      .eq("id", input.programacion_origen_id);

    if (programacionError) {
      logger.error("upsertActa (link programacion)", programacionError.message);
      return { id: savedId, errorMessage: `Acta guardada, pero no se pudo vincular la programación: ${programacionError.message}` };
    }
  }

  bumpPortalSnapshotVersion();

  return { id: savedId };
}

export async function replaceActaInvitados(
  actaId: string,
  guests: { nombre: string; cargo: string }[],
): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, errorMessage: "Cliente Supabase no disponible." };

  const { error: deleteError } = await supabase.from("actas_invitados").delete().eq("acta_id", actaId);

  if (deleteError) {
    logger.error("replaceActaInvitados (delete)", deleteError.message);
    return { ok: false, errorMessage: deleteError.message };
  }

  if (guests.length > 0) {
    const { error: insertError } = await supabase
      .from("actas_invitados")
      .insert(guests.map((guest) => ({ acta_id: actaId, nombre: guest.nombre, cargo: guest.cargo })));

    if (insertError) {
      logger.error("replaceActaInvitados (insert)", insertError.message);
      return { ok: false, errorMessage: insertError.message };
    }
  }

  bumpPortalSnapshotVersion();

  return { ok: true };
}

export async function uploadActaDocument(
  actaId: string,
  rbd: string,
  file: File,
  actaYear: number,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; errorMessage: null } | { url: null; errorMessage: string }> {
  const supabase = createClient();
  if (!supabase) return { url: null, errorMessage: "Cliente Supabase no disponible." };
  const storageBucket = "evidencias_actas";
  const safePath = buildActaDocumentPath(actaId, rbd, file.name, actaYear);
  const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
  const { data: authSessionData, error: authSessionError } = await supabase.auth.getSession();
  const authUser = authUserData.user;
  const authSession = authSessionData.session;

  logger.info("uploadActaDocument", "Starting storage upload", {
    actaId,
    rbd,
    storageBucket,
    safePath,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    authUserId: authUser?.id ?? null,
    authEmail: maskEmail(authUser?.email),
    authUserError: authUserError?.message ?? null,
    hasSession: Boolean(authSession),
    sessionUserId: authSession?.user?.id ?? null,
    sessionEmail: maskEmail(authSession?.user?.email),
    hasAccessToken: Boolean(authSession?.access_token),
    tokenExpiresAt: authSession?.expires_at ?? null,
    authSessionError: authSessionError?.message ?? null,
  });

  onProgress?.(50);

  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(safePath, file, { upsert: true, contentType: file.type || "application/octet-stream" });

  if (error) {
    logger.error("uploadActaDocument", error.message, {
      actaId,
      rbd,
      storageBucket,
      safePath,
      authUserId: authUser?.id ?? null,
      authEmail: maskEmail(authUser?.email),
      hasSession: Boolean(authSession),
      sessionUserId: authSession?.user?.id ?? null,
      sessionEmail: maskEmail(authSession?.user?.email),
      hasAccessToken: Boolean(authSession?.access_token),
      errorName: error.name ?? null,
    });
    onProgress?.(0);
    return { url: null, errorMessage: error.message };
  }

  onProgress?.(100);
  const { data } = supabase.storage.from(storageBucket).getPublicUrl(safePath);
  logger.info("uploadActaDocument", "Storage upload completed", {
    actaId,
    rbd,
    storageBucket,
    safePath,
    authUserId: authUser?.id ?? null,
    authEmail: maskEmail(authUser?.email),
    hasSession: Boolean(authSession),
    sessionUserId: authSession?.user?.id ?? null,
    sessionEmail: maskEmail(authSession?.user?.email),
    hasAccessToken: Boolean(authSession?.access_token),
    publicUrl: data.publicUrl,
  });
  return { url: data.publicUrl, errorMessage: null };
}

export async function deleteActaDocument(actaId: string, rbd: string, fileName: string, actaYear: number): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const storageBucket = "evidencias_actas";
  const safePath = buildActaDocumentPath(actaId, rbd, fileName, actaYear);
  const { error } = await supabase.storage.from(storageBucket).remove([safePath]);

  if (error) {
    logger.error("deleteActaDocument", error.message);
    return false;
  }

  return true;
}

export async function updateActaLink(actaId: string, url: string): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, errorMessage: "Cliente Supabase no disponible." };

  const { error } = await supabase.from("actas").update({ link_acta: url }).eq("id", actaId);
  if (error) {
    logger.error("updateActaLink", error.message);
    return { ok: false, errorMessage: error.message };
  }

  bumpPortalSnapshotVersion();

  return { ok: true };
}

export async function deleteActa(actaId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase.from("actas").delete().eq("id", actaId);

  if (error) {
    logger.error("deleteActa", error.message);
    return false;
  }

  bumpPortalSnapshotVersion();

  return true;
}

export async function listPortalUserAccess(): Promise<{ data: PortalUserAccess[]; errorMessage?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { data: [], errorMessage: "Cliente Supabase no disponible." };
  }

  const { data, error } = await supabase
    .from("usuario_establecimiento_roles")
    .select("id, correo_electronico, email_normalizado, rbd, rol, equipo, origen, metadata, activo, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    logger.error("listPortalUserAccess", error.message);
    return { data: [], errorMessage: humanizeUserAccessError(error.message) };
  }

  return {
    data: ((data ?? []) as PortalUserAccessRow[]).map(normalizePortalUserAccess),
  };
}

export async function upsertPortalUserAccess(input: PortalUserAccessUpsertInput): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, errorMessage: "Cliente Supabase no disponible." };
  }

  const { error } = await supabase.rpc("upsert_usuario_establecimiento_rol", {
    p_correo_electronico: input.correo_electronico,
    p_rbd: input.rbd ?? "",
    p_rol: input.rol,
    p_equipo: input.equipo ?? "",
    p_origen: input.origen ?? "manual",
    p_metadata: (input.metadata ?? {}) as Json,
  });

  if (error) {
    logger.error("upsertPortalUserAccess", error.message);
    return { ok: false, errorMessage: humanizeUserAccessError(error.message) };
  }

  return { ok: true };
}

export async function deactivatePortalUserAccess(accessId: string): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, errorMessage: "Cliente Supabase no disponible." };
  }

  const { error } = await supabase
    .from("usuario_establecimiento_roles")
    .update({ activo: false })
    .eq("id", accessId);

  if (error) {
    logger.error("deactivatePortalUserAccess", error.message);
    return { ok: false, errorMessage: humanizeUserAccessError(error.message) };
  }

  return { ok: true };
}

export async function listPortalAccessAudit(limit = 50): Promise<{ data: PortalAccessAuditEntry[]; errorMessage?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { data: [], errorMessage: "Cliente Supabase no disponible." };
  }

  const { data, error } = await supabase
    .from("portal_access_audit")
    .select("id, access_id, admin_email, accion, snapshot_antes, snapshot_despues, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("listPortalAccessAudit", error.message);
    return { data: [], errorMessage: humanizeAuditError(error.message) };
  }

  return {
    data: ((data ?? []) as PortalAccessAuditRow[]).map(normalizePortalAccessAudit),
  };
}

export async function listPortalLogs(limit = 50): Promise<{ data: LogEntry[]; errorMessage?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { data: [], errorMessage: "Cliente Supabase no disponible." };
  }

  const { data, error } = await supabase
    .from("logs")
    .select("id, usuario, rbd, accion, detalle, vista_origen, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("listPortalLogs", error.message);
    return { data: [], errorMessage: humanizeAuditError(error.message) };
  }

  return {
    data: ((data ?? []) as LogEntryRow[]).map(normalizeLogEntry),
  };
}

export async function ensureExtraordinarySessionReason(
  name: string,
): Promise<{ reason: ExtraordinarySessionReason | null; errorMessage?: string }> {
  const supabase = createClient();
  if (!supabase) return { reason: null, errorMessage: "Cliente Supabase no disponible." };

  const cleanedName = name.trim();
  if (!cleanedName) {
    return { reason: null, errorMessage: "Debes indicar el motivo de la sesión extraordinaria." };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("motivos_sesion_extraordinaria")
    .select("id, nombre")
    .ilike("nombre", cleanedName);

  if (existingError) {
    logger.error("ensureExtraordinarySessionReason (select)", existingError.message);
    return { reason: null, errorMessage: existingError.message };
  }

  const existing = ((existingRows ?? []) as ExtraordinarySessionReasonRow[]).find(
    (row) => row.nombre.trim().localeCompare(cleanedName, "es", { sensitivity: "base" }) === 0,
  );

  if (existing) {
    return { reason: existing };
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("motivos_sesion_extraordinaria")
    .insert({ nombre: cleanedName })
    .select("id, nombre")
    .single();

  if (insertError) {
    const { data: retryRows, error: retryError } = await supabase
      .from("motivos_sesion_extraordinaria")
      .select("id, nombre")
      .ilike("nombre", cleanedName);

    if (retryError) {
      logger.error("ensureExtraordinarySessionReason (insert)", insertError.message);
      return { reason: null, errorMessage: insertError.message };
    }

    const retried = ((retryRows ?? []) as ExtraordinarySessionReasonRow[]).find(
      (row) => row.nombre.trim().localeCompare(cleanedName, "es", { sensitivity: "base" }) === 0,
    );

    if (!retried) {
      logger.error("ensureExtraordinarySessionReason (insert)", insertError.message);
      return { reason: null, errorMessage: insertError.message };
    }

    return { reason: retried };
  }

  bumpPortalSnapshotVersion();

  return { reason: insertedRow as ExtraordinarySessionReason };
}

export async function fetchPortalSnapshot(rbdFilter?: string): Promise<PortalSnapshot> {
  const supabase = createClient();

  if (!supabase) {
    return getMockPortalSnapshot(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno del frontend.",
      [{ scope: "frontend", status: "error", message: "Next no encontró variables públicas de Supabase en este build." }],
    );
  }

  try {
    const programacionQuery = supabase
      .from("programacion")
      .select("id, rbd, tipo_sesion, numero_sesion, fecha_programada, hora_programada, formato_planeado, lugar_tentativo, tematicas, estado, acta_vinculada_id")
      .order("fecha_programada", { ascending: true });

    const actasQuery = supabase
      .from("actas")
      .select("id, rbd, sesion, modo_registro, tipo_sesion, formato, fecha, hora_inicio, hora_termino, lugar, comuna, direccion, tabla_temas, desarrollo, acuerdos, varios, observacion_documental, motivo_extraordinaria_id, motivo_extraordinaria, suspension_clases_detalle, proxima_sesion, link_acta, asistentes")
      .order("fecha", { ascending: false });

    const extraordinarySessionReasonsQuery = supabase
      .from("motivos_sesion_extraordinaria")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    const [establishmentsResult, programacionesResult, actasResult, extraordinarySessionReasonsResult] = await Promise.all([
      supabase.from("establecimientos").select("rbd, nombre, direccion, comuna").order("nombre", { ascending: true }),
      rbdFilter ? programacionQuery.eq("rbd", rbdFilter) : programacionQuery,
      rbdFilter ? actasQuery.eq("rbd", rbdFilter) : actasQuery,
      extraordinarySessionReasonsQuery,
    ]);

    const actaIds = (actasResult.data ?? []).map((a: { id: string }) => a.id);
    let invitadosResult: { data: InvitadoRow[] | null; error: { message: string } | null };
    if (rbdFilter && actaIds.length === 0) {
      invitadosResult = { data: [], error: null };
    } else {
      const invitadosQuery = supabase
        .from("actas_invitados")
        .select("id, acta_id, nombre, cargo")
        .order("created_at", { ascending: true });
      const raw = await (rbdFilter ? invitadosQuery.in("acta_id", actaIds) : invitadosQuery);
      invitadosResult = {
        data: (raw.data ?? []) as InvitadoRow[],
        error: raw.error ? { message: raw.error.message } : null,
      };
    }

    const firstError = [
      establishmentsResult.error,
      programacionesResult.error,
      actasResult.error,
      invitadosResult.error,
    ].find(Boolean);

    const diagnostics: PortalDiagnostic[] = [
      { scope: "frontend", status: "ok", message: "Variables públicas de Supabase cargadas en el build." },
      buildQueryDiagnostic("establecimientos", establishmentsResult.data?.length ?? 0, establishmentsResult.error?.message),
      buildQueryDiagnostic("programacion", programacionesResult.data?.length ?? 0, programacionesResult.error?.message),
      buildQueryDiagnostic("actas", actasResult.data?.length ?? 0, actasResult.error?.message),
      buildQueryDiagnostic("actas_invitados", invitadosResult.data?.length ?? 0, invitadosResult.error?.message),
      buildQueryDiagnostic(
        "motivos_sesion_extraordinaria",
        extraordinarySessionReasonsResult.data?.length ?? 0,
        extraordinarySessionReasonsResult.error?.message,
      ),
    ];

    if (firstError) {
      return getMockPortalSnapshot(firstError.message, diagnostics);
    }

    const establishments = (establishmentsResult.data ?? []) as Establishment[];
    const programaciones = sortProgramaciones((programacionesResult.data ?? []) as Programacion[]);
    const invitadosPorActa = new Map<string, InvitedGuest[]>();

    ((invitadosResult.data ?? []) as InvitadoRow[]).forEach((item) => {
      const invitados = invitadosPorActa.get(item.acta_id) ?? [];
      invitados.push({ id: item.id, nombre: item.nombre, cargo: item.cargo });
      invitadosPorActa.set(item.acta_id, invitados);
    });

    const actas = sortActas(
      ((actasResult.data ?? []) as ActaRow[]).map((item) => ({
        id: item.id,
        rbd: item.rbd,
        sesion: item.sesion,
        modo_registro: normalizeActaMode(item.modo_registro),
        tipo_sesion: item.tipo_sesion,
        formato: item.formato,
        fecha: item.fecha,
        hora_inicio: typeof item.hora_inicio === "string" ? item.hora_inicio : null,
        hora_termino: typeof item.hora_termino === "string" ? item.hora_termino : null,
        lugar: typeof item.lugar === "string" ? item.lugar : "",
        comuna: typeof item.comuna === "string" ? item.comuna : "",
        direccion: typeof item.direccion === "string" ? item.direccion : "",
        tabla_temas: typeof item.tabla_temas === "string" ? item.tabla_temas : "",
        desarrollo: typeof item.desarrollo === "string" ? item.desarrollo : "",
        acuerdos: typeof item.acuerdos === "string" ? item.acuerdos : "",
        varios: typeof item.varios === "string" ? item.varios : "",
        observacion_documental: typeof item.observacion_documental === "string" ? item.observacion_documental : "",
        motivo_extraordinaria_id: typeof item.motivo_extraordinaria_id === "string" ? item.motivo_extraordinaria_id : null,
        motivo_extraordinaria: typeof item.motivo_extraordinaria === "string" ? item.motivo_extraordinaria : null,
        suspension_clases_detalle: normalizeSuspensionClassesDetail(item.suspension_clases_detalle),
        proxima_sesion: item.proxima_sesion,
        link_acta: item.link_acta,
        asistentes: normalizeAsistentes(item.asistentes),
        invitados: invitadosPorActa.get(item.id) ?? [],
      })),
    );

    const extraordinarySessionReasons = ((extraordinarySessionReasonsResult.data ?? []) as ExtraordinarySessionReasonRow[])
      .map((item) => ({ id: item.id, nombre: item.nombre }))
      .sort((left, right) => left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" }));

    return {
      establishments,
      programaciones,
      actas,
      extraordinarySessionReasons,
      attendanceByRole: buildAttendanceByRole(actas),
      planningByComuna: buildPlanningByComuna(programaciones, establishments),
      actasByMode: buildActasByMode(actas),
      source: "supabase",
      diagnostics,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "No fue posible consultar Supabase desde el navegador.";
    return getMockPortalSnapshot(reason, [{ scope: "frontend", status: "error", message: reason }]);
  }
}
