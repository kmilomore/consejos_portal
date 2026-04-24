import type { Acta, Establishment, Programacion } from "@/types/domain";

export const establishments: Establishment[] = [
  {
    rbd: "1712-4",
    nombre: "Escuela República del Viento",
    direccion: "Av. Los Naranjos 120",
    comuna: "San Fernando",
  },
  {
    rbd: "2450-9",
    nombre: "Liceo Bicentenario Valle Central",
    direccion: "Calle Comercio 418",
    comuna: "Nancagua",
  },
  {
    rbd: "3011-8",
    nombre: "Escuela Rural Puerta del Sol",
    direccion: "Ruta I-90 Km 12",
    comuna: "Chimbarongo",
  },
];

export const programaciones: Programacion[] = [
  {
    id: "prog-01",
    rbd: "1712-4",
    tipo_sesion: "Ordinaria",
    numero_sesion: 1,
    fecha_programada: "2026-04-24",
    hora_programada: "15:30",
    formato_planeado: "Presencial",
    lugar_tentativo: "Biblioteca CRA",
    tematicas: "Plan de convivencia, infraestructura crítica y preparación cuenta pública.",
    estado: "PROGRAMADA",
    acta_vinculada_id: null,
  },
  {
    id: "prog-02",
    rbd: "2450-9",
    tipo_sesion: "Ordinaria",
    numero_sesion: 2,
    fecha_programada: "2026-05-03",
    hora_programada: "17:00",
    formato_planeado: "Híbrido",
    lugar_tentativo: "Sala de Consejo",
    tematicas: "Seguimiento PME, asistencia crítica y articulación con centro de estudiantes.",
    estado: "PROGRAMADA",
    acta_vinculada_id: null,
  },
  {
    id: "prog-03",
    rbd: "3011-8",
    tipo_sesion: "Extraordinaria",
    numero_sesion: 5,
    fecha_programada: "2026-05-08",
    hora_programada: "09:00",
    formato_planeado: "Online",
    lugar_tentativo: "Videollamada Meet",
    tematicas: "Ajuste de transporte escolar y reasignación de recursos de mantención.",
    estado: "PROGRAMADA",
    acta_vinculada_id: null,
  },
];

export const actas: Acta[] = [
  {
    id: "acta-01",
    rbd: "1712-4",
    sesion: 1,
    modo_registro: "ACTA_COMPLETA",
    tipo_sesion: "Ordinaria",
    formato: "Presencial",
    fecha: "2026-03-28",
    hora_inicio: "15:35",
    hora_termino: "17:08",
    lugar: "Biblioteca CRA",
    comuna: "San Fernando",
    direccion: "Av. Los Naranjos 120",
    tabla_temas: "1. Diagnóstico convivencia. 2. Resultados asistencia. 3. Cronograma primer semestre.",
    desarrollo: "Se revisó la asistencia del primer bimestre y se acordó priorizar visitas domiciliarias y tutorías de permanencia.",
    acuerdos: "Actualizar protocolo de derivación, calendarizar jornadas con apoderados y reportar avance mensual al sostenedor.",
    varios: "Se solicitó apoyo para reparación de portón principal.",
    observacion_documental: "",
    proxima_sesion: "2026-04-24",
    link_acta: null,
    asistentes: [
      { rol: "Director", nombre: "María Luisa Soto", correo: "maria.soto@slep.cl", asistio: true },
      { rol: "Sostenedor", nombre: "Carlos Rivera", correo: "crivera@slep.cl", asistio: true },
      { rol: "Docente", nombre: "Daniela Pavez", correo: "dpavez@escuela.cl", asistio: true },
      { rol: "Asistente", nombre: "Iván Toro", correo: "itoro@escuela.cl", asistio: false },
      { rol: "Estudiante", nombre: "Sofía Muñoz", correo: "sofiam@gmail.com", asistio: true },
      { rol: "Apoderado", nombre: "Paola Rojas", correo: "paola.rojas@gmail.com", asistio: true }
    ],
    invitados: [
      { id: "inv-01", nombre: "Carolina Leiva", cargo: "Encargada convivencia" }
    ],
  },
  {
    id: "acta-02",
    rbd: "2450-9",
    sesion: 1,
    modo_registro: "ACTA_COMPLETA",
    tipo_sesion: "Ordinaria",
    formato: "Híbrido",
    fecha: "2026-03-22",
    hora_inicio: "16:05",
    hora_termino: "17:20",
    lugar: "Sala de Consejo",
    comuna: "Nancagua",
    direccion: "Calle Comercio 418",
    tabla_temas: "1. Ajuste del reglamento interno. 2. Preparación aniversario. 3. Estado de infraestructura eléctrica.",
    desarrollo: "La sesión priorizó el resguardo eléctrico de laboratorios y la actualización del calendario de hitos institucionales.",
    acuerdos: "Levantar informe técnico, citar comité de seguridad y formalizar revisión de reglamento.",
    varios: "Sin puntos adicionales.",
    observacion_documental: "",
    proxima_sesion: "2026-05-03",
    link_acta: null,
    asistentes: [
      { rol: "Director", nombre: "Felipe Aránguiz", correo: "felipe.aranguiz@slep.cl", asistio: true },
      { rol: "Sostenedor", nombre: "Mónica Fuentes", correo: "mfuentes@slep.cl", asistio: true },
      { rol: "Docente", nombre: "Lorena Vega", correo: "lvega@liceo.cl", asistio: true },
      { rol: "Asistente", nombre: "Sergio Díaz", correo: "sdiaz@liceo.cl", asistio: true },
      { rol: "Estudiante", nombre: "Cristóbal Jara", correo: "cristobal@gmail.com", asistio: false },
      { rol: "Apoderado", nombre: "Bárbara Salinas", correo: "barbarasalinas@gmail.com", asistio: true }
    ],
    invitados: [
      { id: "inv-02", nombre: "Andrea Mora", cargo: "Prevencionista de riesgos" },
      { id: "inv-03", nombre: "Luis Núñez", cargo: "Administrador SEP" }
    ],
  },
];

export const attendanceByRole = [
  { rol: "Director", ratio: 1 },
  { rol: "Sostenedor", ratio: 1 },
  { rol: "Docente", ratio: 1 },
  { rol: "Asistente", ratio: 0.5 },
  { rol: "Estudiante", ratio: 0.5 },
  { rol: "Apoderado", ratio: 1 },
];

export const planningByComuna = [
  { comuna: "San Fernando", total: 7 },
  { comuna: "Nancagua", total: 5 },
  { comuna: "Chimbarongo", total: 4 },
];