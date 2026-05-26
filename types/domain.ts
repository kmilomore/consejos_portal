// The `(string & {})` intersection preserves autocomplete for the literal members
// without collapsing the union to plain `string`. Do not simplify.
export type UserRole = "ADMIN" | "DIRECTOR" | (string & {});

export type SessionType = "Ordinaria" | "Extraordinaria";
export type SessionFormat = "Presencial" | "Online" | "Híbrido";
export type PlanningStatus = "PROGRAMADA" | "REALIZADA" | "CANCELADA";
export type ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL";

export const DEFAULT_EXTRAORDINARY_SESSION_REASON_LABELS = [
  "Suspensión de clases",
  "Revisión y modificación al reglamento interno",
  "Actualización de protocolo de actuación",
  "Subsanación de observaciones de SIE",
  "Subsanación de observaciones de Salud",
  "Proyectos de conservación",
  "Cuenta Pública",
  "Cierre de año escolar",
  "Modificación al calendario escolar",
] as const;

export interface Establishment {
  rbd: string;
  nombre: string;
  direccion: string;
  comuna: string;
}

export interface Profile {
  id: string;
  correo_electronico: string;
  rol: UserRole;
  rbd: string | null;
  comuna: string | null;
  nombre_director: string | null;
}

export interface PortalScope {
  role_text: UserRole;
  is_global_admin: boolean;
  accessible_rbds: string[];
  default_rbd: string | null;
  can_select_school: boolean;
  landing_route: "/admin/" | "/resumen/";
  is_read_only?: boolean;
  can_manage_users?: boolean;
}

export type PortalManagedAccessRole = "ADMIN" | "COLABORADOR" | "DIRECTOR" | "REPRESENTANTE";

export interface PortalUserAccess {
  id: string;
  correo_electronico: string;
  email_normalizado: string;
  rbd: string | null;
  rol: string;
  equipo: string;
  origen: string;
  metadata: Record<string, unknown>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Programacion {
  id: string;
  rbd: string;
  tipo_sesion: SessionType;
  numero_sesion: number;
  fecha_programada: string;
  hora_programada: string;
  formato_planeado: SessionFormat;
  lugar_tentativo: string;
  tematicas: string;
  estado: PlanningStatus;
  acta_vinculada_id: string | null;
}

export interface AttendeeSlot {
  rol: string;
  nombre: string;
  rut?: string;
  correo: string;
  asistio: boolean;
  modalidad?: "Presencial" | "Virtual";
}

export interface InvitedGuest {
  id: string;
  nombre: string;
  cargo: string;
}

export interface ExtraordinarySessionReason {
  id: string;
  nombre: string;
}

export type SuspensionRecoveryType = "Con JEC" | "Sin JEC" | "Educación de adulto";

export interface SuspensionClassDetail {
  fecha_suspension: string;
  fecha_recuperacion: string;
  tipo_jornada: SuspensionRecoveryType;
}

export interface Acta {
  id: string;
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
  suspension_clases_detalle: SuspensionClassDetail[];
  proxima_sesion: string | null;
  link_acta: string | null;
  asistentes: AttendeeSlot[];
  invitados: InvitedGuest[];
}

export interface LogEntry {
  id: string;
  usuario: string;
  rbd: string;
  accion: "CREAR_ACTA" | "EDITAR_ACTA" | "ELIMINAR_ACTA" | "LOGIN";
  detalle: string;
  vista_origen: string;
  created_at: string;
}

/** Row returned by the get_slep_directorio() RPC — sourced from BASE DE DATOS ESCUELAS SLEP */
export interface SlepEscuela {
  rbd: string | null;
  nombre_establecimiento: string | null;
  comuna: string | null;
  rural_urbano: string | null;
  tipo: string | null;
  director: string | null;
  representante_consejo: string | null;
  correo_representante: string | null;
  asesor_uatp: string | null;
  correo_asesor: string | null;
  correo_electronico: string | null;
  latitud: string | null;
  longitud: string | null;
}