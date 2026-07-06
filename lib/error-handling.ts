//este modulo centraluza la clasificación de errores y el manejo de reintentos para uploads 
//y operaciones de red, incluyendo logging y mensajes amigables para el usuario final

import { logger } from "@/lib/logger";

export enum ErrorCategory {
  //autenticación y acceso
  AUTH_SESSION_INIT = "AUTH_SESSION_INIT",
  AUTH_SCOPE_RESOLUTION = "AUTH_SCOPE_RESOLUTION",
  AUTH_SCOPE_TIMEOUT = "AUTH_SCOPE_TIMEOUT",
  AUTH_NO_PROFILE = "AUTH_NO_PROFILE",
  AUTH_NO_ESTABLISHMENT = "AUTH_NO_ESTABLISHMENT",
  AUTH_DOMAIN_RESTRICTION = "AUTH_DOMAIN_RESTRICTION",
  AUTH_PERMISSION_DENIED = "AUTH_PERMISSION_DENIED",

  //datos de entrada
  VALIDATION_INVALID_RUT = "VALIDATION_INVALID_RUT",
  VALIDATION_INVALID_EMAIL = "VALIDATION_INVALID_EMAIL",
  VALIDATION_INVALID_DATE = "VALIDATION_INVALID_DATE",
  VALIDATION_REQUIRED_FIELD = "VALIDATION_REQUIRED_FIELD",

  //subida y archivos
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  FILE_INVALID_TYPE = "FILE_INVALID_TYPE",
  FILE_UPLOAD_TIMEOUT = "FILE_UPLOAD_TIMEOUT",
  FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED",
  FILE_UPLOAD_NETWORK = "FILE_UPLOAD_NETWORK",

  //persistencia de datos en BD
  DB_DUPLICATE_KEY = "DB_DUPLICATE_KEY",
  DB_CONSTRAINT_VIOLATION = "DB_CONSTRAINT_VIOLATION",
  DB_FOREIGN_KEY = "DB_FOREIGN_KEY",
  DB_TIMEOUT = "DB_TIMEOUT",
  DB_PERMISSION_DENIED = "DB_PERMISSION_DENIED",
  DB_GENERIC = "DB_GENERIC",

  //conectividad de red
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_OFFLINE = "NETWORK_OFFLINE",
  NETWORK_GENERIC = "NETWORK_GENERIC",

  //sistema y entorno
  SUPABASE_INIT_FAILED = "SUPABASE_INIT_FAILED",
  STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE",
  UNKNOWN = "UNKNOWN",
}

export interface PortalError {
  category: ErrorCategory;
  message: string; //aqui el ,ensaje para usuario final
  details?: string; //detalles tecnicos para logging
  originalError?: unknown;
  retryable?: boolean;
  suggestedAction?: string; //que deberia hacer el usuario
}

//clasifica errores de base de datos, incluyendo constraint violations, duplicate keys y permisos
function ClasificacionErrorBD(message: string | null | undefined): {
  category: ErrorCategory;
  retryable: boolean;
} {
  const lower = (message ?? "").toLowerCase();

  if (lower.includes("duplicate key")) {
    return { category: ErrorCategory.DB_DUPLICATE_KEY, retryable: false };
  }

  if (lower.includes("unique constraint")) {
    return { category: ErrorCategory.DB_DUPLICATE_KEY, retryable: false };
  }

  if (lower.includes("check constraint")) {
    return { category: ErrorCategory.DB_CONSTRAINT_VIOLATION, retryable: false };
  }

  if (lower.includes("foreign key")) {
    return { category: ErrorCategory.DB_FOREIGN_KEY, retryable: false };
  }

  if (lower.includes("permission denied") || lower.includes("not authorized")) {
    return { category: ErrorCategory.DB_PERMISSION_DENIED, retryable: false };
  }

  if (lower.includes("timeout") || lower.includes("query took")) {
    return { category: ErrorCategory.DB_TIMEOUT, retryable: true };
  }

  return { category: ErrorCategory.DB_GENERIC, retryable: false };
}

//clasifica errores de autorización y acceso, incluyendo perfiles, establecimientos y dominios
function ClasificarErrorAutorizacion(message: string | null | undefined): {
  category: ErrorCategory;
  retryable: boolean;
} {
  const lower = (message ?? "").toLowerCase();

  if (
    lower.includes("no existe un perfil portal")
    || lower.includes("json object requested, multiple (or no) rows returned")
    || lower.includes("usuario_perfiles")
    || lower.includes("usuarios_perfiles")
  ) {
    return { category: ErrorCategory.AUTH_NO_PROFILE, retryable: false };
  }

  if (
    lower.includes("no se encontró el establecimiento asociado")
    || lower.includes("establecimiento asociado")
    || lower.includes("establecimientos")
  ) {
    return { category: ErrorCategory.AUTH_NO_ESTABLISHMENT, retryable: false };
  }

  if (
    lower.includes("dominio institucional")
    || lower.includes("dominio permitido")
    || lower.includes("solo se permiten correos del dominio")
  ) {
    return { category: ErrorCategory.AUTH_DOMAIN_RESTRICTION, retryable: false };
  }

  if (
    lower.includes("permission denied")
    || lower.includes("not authorized")
    || lower.includes("forbidden")
  ) {
    return { category: ErrorCategory.AUTH_PERMISSION_DENIED, retryable: false };
  }

  return { category: ErrorCategory.AUTH_SESSION_INIT, retryable: true };
}

//clasifica errores de red, incluyendo timeouts y desconexiones
function ClasificarErroRed(error: unknown): {
  category: ErrorCategory;
  retryable: boolean;
} {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (message.includes("offline") || message.includes("network")) {
      return { category: ErrorCategory.NETWORK_OFFLINE, retryable: true };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout") || message.includes("timed out")) {
      return { category: ErrorCategory.NETWORK_TIMEOUT, retryable: true };
    }
  }

  return { category: ErrorCategory.NETWORK_GENERIC, retryable: true };
}

//genera un mensaje para el usuario normal no inforamtico basado en la categoria de error y detalles opcionales
function generarMensajeparaMortales(category: ErrorCategory, details?: string): {
  message: string;
  suggestedAction?: string;
} {
  const messages: Record<ErrorCategory, { message: string; suggestedAction?: string }> = {
    [ErrorCategory.AUTH_SESSION_INIT]: {
      message: "No fue posible iniciar tu sesión. Por favor, intenta de nuevo.",
      suggestedAction: "Recarga la página o cierra tu sesión y vuelve a ingresar.",
    },
    [ErrorCategory.AUTH_SCOPE_RESOLUTION]: {
      message: "No se pudo resolver tu acceso al portal. Por favor, intenta de nuevo.",
      suggestedAction: "Si el problema persiste, contacta al administrador del portal.",
    },
    [ErrorCategory.AUTH_SCOPE_TIMEOUT]: {
      message: "El portal tardó demasiado en validar tu acceso. Por favor, recarga la página.",
      suggestedAction: "Si sigue siendo lento, intenta desde otra red o dispositivo.",
    },
    [ErrorCategory.AUTH_NO_PROFILE]: {
      message: "Tu cuenta autenticada no tiene un perfil habilitado en el portal.",
      suggestedAction: "Revisa que tu correo esté cargado en la base de accesos del portal.",
    },
    [ErrorCategory.AUTH_NO_ESTABLISHMENT]: {
      message: "Tu cuenta sí autenticó, pero no tiene una escuela vinculada para entrar al portal.",
      suggestedAction: "Contacta al administrador del portal para vincular tu establecimiento.",
    },
    [ErrorCategory.AUTH_DOMAIN_RESTRICTION]: {
      message: "Tu correo no pertenece al dominio institucional permitido para este portal.",
      suggestedAction: "Intenta ingresar con tu correo institucional registrado.",
    },
    [ErrorCategory.AUTH_PERMISSION_DENIED]: {
      message: "Tu cuenta autenticó, pero no tiene permisos para abrir este portal.",
      suggestedAction: "Contacta al administrador del portal para solicitar acceso.",
    },

    [ErrorCategory.VALIDATION_INVALID_RUT]: {
      message: "El RUT ingresado no es válido.",
      suggestedAction: "Verifica el formato: debe ser XXX.XXX.XXX-X (ej: 12.345.678-9).",
    },
    [ErrorCategory.VALIDATION_INVALID_EMAIL]: {
      message: "El correo electrónico ingresado no es válido.",
      suggestedAction: "Verifica que incluya el símbolo @ y un dominio válido.",
    },
    [ErrorCategory.VALIDATION_INVALID_DATE]: {
      message: "La fecha ingresada no es válida.",
      suggestedAction: "Usa el formato DD/MM/YYYY o selecciona desde el calendario.",
    },
    [ErrorCategory.VALIDATION_REQUIRED_FIELD]: {
      message: "Hay campos obligatorios sin completar.",
      suggestedAction: "Revisa los campos marcados en rojo y completa toda la información requerida.",
    },

    [ErrorCategory.FILE_TOO_LARGE]: {
      message: details
        ? `El archivo supera el tamaño máximo permitido. Máximo: ${details}.`
        : "El archivo es demasiado grande. Máximo: 50 MB.",
      suggestedAction: "Comprime el archivo o divide el contenido en múltiples documentos.",
    },
    [ErrorCategory.FILE_INVALID_TYPE]: {
      message: "El tipo de archivo no es permitido.",
      suggestedAction: "Por favor, sube un archivo PDF.",
    },
    [ErrorCategory.FILE_UPLOAD_TIMEOUT]: {
      message: "El upload tardó demasiado. Por favor, intenta de nuevo.",
      suggestedAction: "Verifica tu conexión de internet e intenta con un archivo más pequeño.",
    },
    [ErrorCategory.FILE_UPLOAD_FAILED]: {
      message: "No se pudo subir el documento. Por favor, intenta de nuevo.",
      suggestedAction: "Verifica tu conexión de internet o contacta al administrador si el problema persiste.",
    },
    [ErrorCategory.FILE_UPLOAD_NETWORK]: {
      message: "Error de conectividad durante la carga del archivo.",
      suggestedAction: "Verifica tu conexión de internet e intenta nuevamente.",
    },

    [ErrorCategory.DB_DUPLICATE_KEY]: {
      message: "Ya existe un registro con esta información en el sistema.",
      suggestedAction: "Intenta modificar el registro existente en lugar de crear uno nuevo.",
    },
    [ErrorCategory.DB_CONSTRAINT_VIOLATION]: {
      message: "El registro no cumple los requisitos mínimos del sistema.",
      suggestedAction: "Verifica que todos los campos obligatorios estén completados correctamente.",
    },
    [ErrorCategory.DB_FOREIGN_KEY]: {
      message: "El registro referenciado no existe o fue eliminado.",
      suggestedAction: "Recarga la página para sincronizar los datos y vuelve a intentar.",
    },
    [ErrorCategory.DB_TIMEOUT]: {
      message: "La operación tardó demasiado en completarse. Por favor, intenta de nuevo.",
      suggestedAction: "Si el problema persiste, intenta posteriormente cuando el servidor esté menos saturado.",
    },
    [ErrorCategory.DB_PERMISSION_DENIED]: {
      message: "No tienes permisos para realizar esta operación.",
      suggestedAction: "Contacta al administrador si crees que deberías tener acceso.",
    },
    [ErrorCategory.DB_GENERIC]: {
      message: "Ocurrió un error al guardar los datos. Por favor, intenta de nuevo.",
      suggestedAction: "Si el problema persiste, contacta al administrador del portal.",
    },

    [ErrorCategory.NETWORK_TIMEOUT]: {
      message: "La solicitud tardó demasiado. Por favor, verifica tu conexión de internet.",
      suggestedAction: "Intenta recargando la página en unos momentos.",
    },
    [ErrorCategory.NETWORK_OFFLINE]: {
      message: "No hay conexión de internet disponible.",
      suggestedAction: "Verifica tu conexión de red e intenta de nuevo cuando estés conectado.",
    },
    [ErrorCategory.NETWORK_GENERIC]: {
      message: "Ocurrió un error de conectividad. Por favor, intenta de nuevo.",
      suggestedAction: "Verifica tu conexión de internet y recarga la página.",
    },

    [ErrorCategory.SUPABASE_INIT_FAILED]: {
      message: "No se pudo inicializar el cliente de Supabase en el navegador.",
      suggestedAction:
        "Verifica que las variables de entorno estén configuradas correctamente.",
    },
    [ErrorCategory.STORAGE_UNAVAILABLE]: {
      message: "El servicio de almacenamiento no está disponible en este momento.",
      suggestedAction: "Por favor, intenta más tarde.",
    },

    [ErrorCategory.UNKNOWN]: {
      message: "Ocurrió un error inesperado. Por favor, intenta de nuevo.",
      suggestedAction: "Si el problema persiste, contacta al administrador del portal.",
    },
  };

  return messages[category] ?? messages[ErrorCategory.UNKNOWN];
}

//clasifica errores genericos de red, incluyendo timeouts y desconexiones
export function ClasificarError(error: unknown): PortalError {
  //supabase con error de red
  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof (error as Record<string, unknown>).message === "string"
  ) {
    const message = (error as Record<string, unknown>).message as string;

    //error de autorización y acceso
    if (message.includes("usuario") || message.includes("perfil") || message.includes("dominio")) {
      const { category, retryable } = ClasificarErrorAutorizacion(message);
      const { message: humanized, suggestedAction } = generarMensajeparaMortales(category);
      return {
        category,
        message: humanized,
        details: message,
        originalError: error,
        retryable,
        suggestedAction,
      };
    }

    //error de base de datos
    if (message.includes("constraint") || message.includes("duplicate") || message.includes("foreign")) {
      const { category, retryable } = ClasificacionErrorBD(message);
      const { message: humanized, suggestedAction } = generarMensajeparaMortales(category);
      return {
        category,
        message: humanized,
        details: message,
        originalError: error,
        retryable,
        suggestedAction,
      };
    }

    //error de upload
    if (message.includes("file") || message.includes("upload") || message.includes("size")) {
      let category = ErrorCategory.FILE_UPLOAD_FAILED;
      let details: string | undefined;

      if (message.includes("timeout")) {
        category = ErrorCategory.FILE_UPLOAD_TIMEOUT;
      } else if (message.includes("size") || message.includes("large")) {
        category = ErrorCategory.FILE_TOO_LARGE;
        //extrae el tamaño máximo permitido
        const sizeMatch = message.match(/(\d+)\s*MB/i);
        details = sizeMatch ? `${sizeMatch[1]} MB` : undefined;
      }

      const { message: humanized, suggestedAction } = generarMensajeparaMortales(category, details);
      return {
        category,
        message: humanized,
        details: message,
        originalError: error,
        retryable: category === ErrorCategory.FILE_UPLOAD_TIMEOUT,
        suggestedAction,
      };
    }

    //error de red comun
    const { category: netCategory, retryable: netRetryable } = ClasificarErroRed(error);
    const { message: netHumanized, suggestedAction: netAction } = generarMensajeparaMortales(netCategory);
    return {
      category: netCategory,
      message: netHumanized,
      details: message,
      originalError: error,
      retryable: netRetryable,
      suggestedAction: netAction,
    };
  }

  //error desconocido
  const { category: netCategory, retryable: netRetryable } = ClasificarError(error);
  const { message: netHumanized, suggestedAction: netAction } = generarMensajeparaMortales(netCategory);
  return {
    category: netCategory,
    message: netHumanized,
    originalError: error,
    retryable: netRetryable,
    suggestedAction: netAction,
  };
}

//logea errores de portal con contexto
export function logPortalError(context: string, error: PortalError, metadata?: Record<string, unknown>) {
  logger.error(context, error.message, {
    category: error.category,
    details: error.details,
    retryable: error.retryable,
    suggestedAction: error.suggestedAction,
    ...metadata,
  });
}

//opciones de reintento para operaciones con retroceso
export interface OpcionesReintento {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export async function ConRetroceso<T>(
  operation: () => Promise<T>,
  options?: OpcionesReintento,
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 10_000,
    backoffMultiplier = 2,
  } = options ?? {};

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  throw lastError;
}

//clasifica errores de upload, incluyendo permisos y almacenamiento lleno
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              timeoutMessage ?? `Operation timed out after ${timeoutMs}ms`,
            ),
          ),
        timeoutMs,
      ),
    ),
  ]);
}

//clasifica errores de upload, incluyendo permisos y almacenamiento lleno
export function ErrorSeralizarPortal(error: PortalError): Record<string, unknown> {
  return {
    category: error.category,
    message: error.message,
    details: error.details,
    retryable: error.retryable,
    suggestedAction: error.suggestedAction,
  };
}
