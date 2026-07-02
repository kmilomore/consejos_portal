import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { LogEntry } from "@/types/domain";

// CREAR_CUENTA lo registra únicamente el trigger sobre auth.users.
export type PortalEventAction = Exclude<LogEntry["accion"], "CREAR_CUENTA">;

export interface PortalEventInput {
  rbd?: string | null;
  detalle?: string;
  vistaOrigen?: string;
}

/**
 * Registra un evento en la bitácora `logs` vía RPC `log_portal_event`.
 * Fire-and-forget: nunca lanza ni bloquea el flujo que lo invoca; el actor
 * se deriva del JWT en el servidor, por lo que no se envía desde el cliente.
 */
export function logPortalEvent(accion: PortalEventAction, input: PortalEventInput = {}): void {
  const supabase = createClient();
  if (!supabase) {
    return;
  }

  void supabase
    .rpc("log_portal_event", {
      p_accion: accion,
      p_rbd: input.rbd ?? "",
      p_detalle: input.detalle ?? "",
      p_vista_origen: input.vistaOrigen ?? "",
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        logger.warn("logPortalEvent", error.message, { accion });
      }
    });
}
