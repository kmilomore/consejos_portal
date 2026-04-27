import { createClient } from "@/lib/supabase/client";
import type {
  Acta,
  ActaRecordMode,
  AttendeeSlot,
  Establishment,
  InvitedGuest,
  Programacion,
  SessionFormat,
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

type ActaRow = Omit<Acta, "asistentes" | "invitados"> & {
  asistentes: unknown;
};

type InvitadoRow = {
  id: string;
  acta_id: string;
  nombre: string;
  cargo: string;
};

const roleOrder = ["Director", "Sostenedor", "Docente", "Asistente", "Estudiante", "Apoderado"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

export function getProgramaciones(): Programacion[] {
  return [];
}

export function getActas(): Acta[] {
  return [];
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
  proxima_sesion: string | null;
  link_acta: string | null;
  asistentes: AttendeeSlot[];
}

function buildActaDocumentPath(actaId: string, rbd: string, fileName: string): string {
  const year = new Date().getFullYear();
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "pdf";
  return `${rbd.replace(/\//g, "-")}/${year}/${actaId}.${ext}`;
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
    proxima_sesion: input.proxima_sesion,
    link_acta: input.link_acta,
    asistentes: input.asistentes,
  };

  const { data, error } = await supabase
    .from("actas")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    console.error("upsertActa (upsert):", error.message);
    return { id: null, errorMessage: error.message };
  }

  return { id: (data as { id: string }).id };
}

export async function replaceActaInvitados(
  actaId: string,
  guests: { nombre: string; cargo: string }[],
): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, errorMessage: "Cliente Supabase no disponible." };

  const { error: deleteError } = await supabase.from("actas_invitados").delete().eq("acta_id", actaId);

  if (deleteError) {
    console.error("replaceActaInvitados (delete):", deleteError.message);
    return { ok: false, errorMessage: deleteError.message };
  }

  if (guests.length > 0) {
    const { error: insertError } = await supabase
      .from("actas_invitados")
      .insert(guests.map((guest) => ({ acta_id: actaId, nombre: guest.nombre, cargo: guest.cargo })));

    if (insertError) {
      console.error("replaceActaInvitados (insert):", insertError.message);
      return { ok: false, errorMessage: insertError.message };
    }
  }

  return { ok: true };
}

export async function uploadActaDocument(
  actaId: string,
  rbd: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const storageBucket = "evidencias_actas";
  const safePath = buildActaDocumentPath(actaId, rbd, file.name);

  onProgress?.(50);

  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(safePath, file, { upsert: true, contentType: file.type || "application/octet-stream" });

  if (error) {
    console.error("uploadActaDocument:", error.message);
    onProgress?.(0);
    return null;
  }

  onProgress?.(100);
  const { data } = supabase.storage.from(storageBucket).getPublicUrl(safePath);
  return data.publicUrl;
}

export async function deleteActaDocument(actaId: string, rbd: string, fileName: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const storageBucket = "evidencias_actas";
  const safePath = buildActaDocumentPath(actaId, rbd, fileName);
  const { error } = await supabase.storage.from(storageBucket).remove([safePath]);

  if (error) {
    console.error("deleteActaDocument:", error.message);
    return false;
  }

  return true;
}

export async function updateActaLink(actaId: string, url: string): Promise<PersistenceStepResult> {
  const supabase = createClient();
  if (!supabase) return { ok: false, errorMessage: "Cliente Supabase no disponible." };

  const { error } = await supabase.from("actas").update({ link_acta: url }).eq("id", actaId);
  if (error) {
    console.error("updateActaLink:", error.message);
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}

export async function deleteActa(actaId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase.from("actas").delete().eq("id", actaId);

  if (error) {
    console.error("deleteActa:", error.message);
    return false;
  }

  return true;
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
      .select("id, rbd, sesion, modo_registro, tipo_sesion, formato, fecha, hora_inicio, hora_termino, lugar, comuna, direccion, tabla_temas, desarrollo, acuerdos, varios, observacion_documental, proxima_sesion, link_acta, asistentes")
      .order("fecha", { ascending: false });

    const [establishmentsResult, programacionesResult, actasResult, invitadosResult] = await Promise.all([
      supabase.from("establecimientos").select("rbd, nombre, direccion, comuna").order("nombre", { ascending: true }),
      rbdFilter ? programacionQuery.eq("rbd", rbdFilter) : programacionQuery,
      rbdFilter ? actasQuery.eq("rbd", rbdFilter) : actasQuery,
      supabase.from("actas_invitados").select("id, acta_id, nombre, cargo").order("created_at", { ascending: true }),
    ]);

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
        proxima_sesion: item.proxima_sesion,
        link_acta: item.link_acta,
        asistentes: normalizeAsistentes(item.asistentes),
        invitados: invitadosPorActa.get(item.id) ?? [],
      })),
    );

    return {
      establishments,
      programaciones,
      actas,
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
