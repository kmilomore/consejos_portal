//este modulo contiene funciones para validar archivos antes de 
//subirlos, y para clasificar errores de upload, incluyendo permisos y almacenamiento lleno
import { ErrorCategory, PortalError, ClasificarError as ClasificacionError, ConRetroceso } from "@/lib/error-handling";
import { logger } from "@/lib/logger";

export interface ResultadoValidacionArchivos {
  ok: boolean;
  error?: PortalError;
}

export interface ConfiguracionSubidaArchivos {
  maxSizeMb: number;
  allowedTypes: string[];
  timeoutMs: number;
}

export const DEFAULT_FILE_CONFIG: ConfiguracionSubidaArchivos = {
  maxSizeMb: 50,
  allowedTypes: ["application/pdf"],
  timeoutMs: 60_000, //1 minuto para uploads
};

//Valida un archivo antes de subirlo, verificando tamaño, tipo y nombre
export function validarArchivoAntesDeSubir(
  file: File,
  config: ConfiguracionSubidaArchivos = DEFAULT_FILE_CONFIG,
): ResultadoValidacionArchivos {
  //Validar tamaño
  const maxSizeBytes = config.maxSizeMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: {
        category: ErrorCategory.FILE_TOO_LARGE,
        message: `El archivo supera el tamaño máximo de ${config.maxSizeMb} MB.`,
        details: `File size: ${(file.size / 1024 / 1024).toFixed(2)} MB, allowed: ${config.maxSizeMb} MB`,
        retryable: false,
        suggestedAction: `Comprime el archivo a menos de ${config.maxSizeMb} MB e intenta de nuevo.`,
      },
    };
  }

  // Validar tipo MIME
  if (!config.allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: {
        category: ErrorCategory.FILE_INVALID_TYPE,
        message: `El tipo de archivo no es permitido. Solo se aceptan: ${config.allowedTypes.join(", ")}`,
        details: `File type: ${file.type}`,
        retryable: false,
        suggestedAction: "Sube un archivo PDF válido.",
      },
    };
  }

  //validar nombre no debe contener caracteres peligrosos
  const unsafeCharsRegex = /[<>:"|?*\x00-\x1f]/g;
  if (unsafeCharsRegex.test(file.name)) {
    return {
      ok: false,
      error: {
        category: ErrorCategory.FILE_INVALID_TYPE,
        message: "El nombre del archivo contiene caracteres no permitidos.",
        details: `File name: ${file.name}`,
        retryable: false,
        suggestedAction: "Renombra el archivo sin caracteres especiales e intenta de nuevo.",
      },
    };
  }

  return { ok: true };
}

//humaniza el tamaño de bytes para mostrar al usuario
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

//clasifica errores específicos de cargas
export function ClasificarErrorCarga(error: unknown): PortalError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return {
        category: ErrorCategory.FILE_UPLOAD_TIMEOUT,
        message: "El upload tardó demasiado. Por favor, intenta de nuevo.",
        details: error.message,
        originalError: error,
        retryable: true,
        suggestedAction: "Verifica tu conexión de internet e intenta con un archivo más pequeño.",
      };
    }

    if (message.includes("network") || message.includes("offline")) {
      return {
        category: ErrorCategory.FILE_UPLOAD_NETWORK,
        message: "Error de conectividad durante la carga del archivo.",
        details: error.message,
        originalError: error,
        retryable: true,
        suggestedAction: "Verifica tu conexión de internet e intenta nuevamente.",
      };
    }

    if (message.includes("forbidden") || message.includes("unauthorized") || message.includes("403") || message.includes("401")) {
      return {
        category: ErrorCategory.DB_PERMISSION_DENIED,
        message: "No tienes permisos para subir archivos a este establecimiento.",
        details: error.message,
        originalError: error,
        retryable: false,
        suggestedAction: "Contacta al administrador del portal si crees que deberías tener acceso.",
      };
    }

    if (message.includes("quota") || message.includes("storage")) {
      return {
        category: ErrorCategory.STORAGE_UNAVAILABLE,
        message: "El almacenamiento del portal está lleno o no disponible.",
        details: error.message,
        originalError: error,
        retryable: false,
        suggestedAction: "Contacta al administrador del portal.",
      };
    }
  }

  return ClasificacionError(error);
}

//ejecuta una subida con reintentos y logging
export async function uploadWithRetries<T>(
  uploadFn: () => Promise<T>,
  context: string,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
  },
): Promise<{ result?: T; error?: PortalError }> {
  try {
    const result = await ConRetroceso(uploadFn, {
      maxAttempts: options?.maxAttempts ?? 3,
      initialDelayMs: options?.initialDelayMs ?? 1_000,
    });

    logger.info(context, "Upload succeeded after potential retries", {
      uploadContext: context,
    });

    return { result };
  } catch (error) {
    const classifiedError = ClasificarErrorCarga(error);

    logger.error(context, "Upload failed after retries", {
      category: classifiedError.category,
      details: classifiedError.details,
      originalError: error,
    });

    return { error: classifiedError };
  }
}
