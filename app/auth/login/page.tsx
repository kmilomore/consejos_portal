"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { toast } from "@/components/ui/toast";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

function readOAuthParams(url: URL) {
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const read = (key: string) => url.searchParams.get(key) ?? hashParams.get(key);

  return {
    error: read("error"),
    errorCode: read("error_code"),
    errorDescription: read("error_description"),
    code: read("code"),
  };
}

function normalizeOAuthErrorMessage(rawMessage: string | null | undefined) {
  const message = (rawMessage ?? "").trim();
  const lowerMessage = message.toLowerCase();

  if (!message) {
    return "No fue posible completar el ingreso con Google. Intenta nuevamente.";
  }

  if (lowerMessage.includes("invalid grant") || lowerMessage.includes("code verifier") || lowerMessage.includes("code challenge")) {
    return "La validación del ingreso con Google expiró o quedó inválida. Intenta entrar nuevamente.";
  }

  if (lowerMessage.includes("signup_disabled") || lowerMessage.includes("signups not allowed for this instance")) {
    return "Supabase rechazó el ingreso porque este proyecto tiene los signups deshabilitados. Si el usuario nunca había entrado por Google, Auth intenta crearlo y la instancia lo bloquea.";
  }

  if (lowerMessage.includes("access denied") || lowerMessage.includes("cancelled") || lowerMessage.includes("canceled")) {
    return "El ingreso con Google fue cancelado antes de completarse.";
  }

  return `No fue posible completar el ingreso con Google: ${message}`;
}

function clearOAuthParams(url: URL) {
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.toString());
}

function AuthCallbackHandler({ onError }: { onError: (message: string | null) => void }) {
  useEffect(() => {
    const client = createClient();

    if (!client) {
      onError("No se pudo inicializar la autenticación en este navegador.");
      return;
    }

    const authClient = client;
    const url = new URL(window.location.href);
    const { code, error, errorCode, errorDescription } = readOAuthParams(url);

    async function handleCallback() {
      logger.info("auth.callback", "Processing login callback", {
        hasCode: Boolean(code),
        hasError: Boolean(error || errorCode),
        pathname: url.pathname,
      });

      if (error || errorCode) {
        const rawError = [error, errorCode, errorDescription].filter(Boolean).join(" | ");
        const normalizedError = normalizeOAuthErrorMessage(rawError);

        logger.error("auth.callback", "OAuth provider returned an error before session exchange", {
          pathname: url.pathname,
          error,
          errorCode,
          errorDescription,
        });

        toast(normalizedError, "error");
        onError(normalizedError);
        clearOAuthParams(url);
        return;
      }

      if (code) {
        toast("OAuth recibido. Intercambiando sesion con Google...", "info");
        const { error } = await authClient.auth.exchangeCodeForSession(code);

        if (error) {
          logger.error("auth.callback", "OAuth code exchange failed", {
            pathname: url.pathname,
            error: error.message,
          });
          onError(normalizeOAuthErrorMessage(error.message));
          return;
        }

        logger.info("auth.callback", "OAuth code exchange completed", {
          pathname: url.pathname,
        });
        toast("OAuth validado. Cargando permisos del portal...", "info");
        onError(null);

        if (!error) {
          clearOAuthParams(url);
        }

        return;
      }

      logger.info("auth.callback", "Login page opened without OAuth code", {
        pathname: url.pathname,
      });
      onError(null);
    }

    void handleCallback();
  }, [onError]);

  return null;
}

export default function LoginPage() {
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!callbackError) {
      return;
    }

    toast(callbackError, "error");
  }, [callbackError]);

  return (
    <>
      <AuthCallbackHandler onError={setCallbackError} />
      <AuthScreen externalError={callbackError} />
    </>
  );
}