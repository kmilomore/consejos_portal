"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/auth/auth-screen";
import { toast } from "@/components/ui/toast";
import { usePortalAuth } from "@/lib/auth/context";
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

  if (lowerMessage.includes("invalid grant") || lowerMessage.includes("code verifier") || lowerMessage.includes("code challenge")) {
    return "Tu intento de ingreso expiró. Vuelve a presionar el botón para entrar de nuevo.";
  }

  if (lowerMessage.includes("signup_disabled") || lowerMessage.includes("signups not allowed for this instance")) {
    return "Tu cuenta aún no tiene acceso habilitado en el portal. Si crees que deberías tenerlo, contacta al equipo administrador.";
  }

  if (lowerMessage.includes("access denied") || lowerMessage.includes("cancelled") || lowerMessage.includes("canceled")) {
    return "El ingreso fue cancelado. Puedes intentarlo de nuevo cuando quieras.";
  }

  if (lowerMessage.includes("issued in the future") || lowerMessage.includes("clock skew")) {
    return "La fecha y hora de tu dispositivo están desajustadas. Activa la hora automática y vuelve a intentar.";
  }

  return "No pudimos completar tu ingreso. Por favor, intenta nuevamente.";
}

function clearOAuthParams(url: URL) {
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url.toString());
}

function AuthCallbackHandler({
  onError,
  onSettled,
}: {
  onError: (message: string | null) => void;
  onSettled: () => void;
}) {
  const handledCallbackRef = useRef<string | null>(null);

  useEffect(() => {
    const client = createClient();

    if (!client) {
      onError("No se pudo inicializar la autenticación en este navegador.");
      onSettled();
      return;
    }

    const authClient = client;
    const url = new URL(window.location.href);
    const { code, error, errorCode, errorDescription } = readOAuthParams(url);
    const callbackSignature = JSON.stringify({ code, error, errorCode, errorDescription, pathname: url.pathname });

    if (handledCallbackRef.current === callbackSignature) {
      return;
    }

    handledCallbackRef.current = callbackSignature;

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
        onSettled();
        return;
      }

      if (code) {
        const { error } = await authClient.auth.exchangeCodeForSession(code);

        // The code is single-use either way; drop it from the URL and history
        // so a failed exchange doesn't leave it behind.
        clearOAuthParams(url);

        if (error) {
          logger.error("auth.callback", "OAuth code exchange failed", {
            pathname: url.pathname,
            error: error.message,
          });
          onError(normalizeOAuthErrorMessage(error.message));
          onSettled();
          return;
        }

        logger.info("auth.callback", "OAuth code exchange completed", {
          pathname: url.pathname,
        });
        onError(null);
        onSettled();

        return;
      }

      logger.info("auth.callback", "Login page opened without OAuth code", {
        pathname: url.pathname,
      });
      onError(null);
      onSettled();
    }

    void handleCallback();
  }, [onError, onSettled]);

  return null;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true" />
        <p className="text-sm font-medium text-white/80">Cargando datos…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { session, isLoading, isSessionReady, landingRoute } = usePortalAuth();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbackPending, setCallbackPending] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const url = new URL(window.location.href);
    const { code, error, errorCode, errorDescription } = readOAuthParams(url);
    return Boolean(code || error || errorCode || errorDescription);
  });
  const handleCallbackSettled = useCallback(() => {
    setCallbackPending(false);
  }, []);

  useEffect(() => {
    if (!callbackError) {
      return;
    }

    toast(callbackError, "error");
  }, [callbackError]);

  useEffect(() => {
    if (callbackPending || !isSessionReady || isLoading || !session) {
      return;
    }

    router.replace(landingRoute);
  }, [callbackPending, isLoading, isSessionReady, landingRoute, router, session]);

  const showLoading = !callbackError && (callbackPending || (isSessionReady && Boolean(session)));

  return (
    <>
      <AuthCallbackHandler onError={setCallbackError} onSettled={handleCallbackSettled} />
      {showLoading ? <LoadingScreen /> : <AuthScreen externalError={callbackError} />}
    </>
  );
}