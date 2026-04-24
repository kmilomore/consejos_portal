export type UserRole = "ADMIN" | "DIRECTOR";

export type SessionType = "Ordinaria" | "Extraordinaria";
export type SessionFormat = "Presencial" | "Online" | "Híbrido";
export type PlanningStatus = "PROGRAMADA" | "REALIZADA" | "CANCELADA";
export type ActaRecordMode = "ACTA_COMPLETA" | "REGISTRO_DOCUMENTAL";

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