"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

function normalizeOAuthErrorMessage(rawMessage: string | null | undefined) {
  const message = (rawMessage ?? "").trim();
  const lowerMessage = message.toLowerCase();

  if (!message) {
    return "No fue posible completar el ingreso con Google. Intenta nuevamente.";
  }

  if (lowerMessage.includes("invalid grant") || lowerMessage.includes("code verifier") || lowerMessage.includes("code challenge")) {
    return "La validación del ingreso con Google expiró o quedó inválida. Intenta entrar nuevamente.";
  }

  if (lowerMessage.includes("access denied") || lowerMessage.includes("cancelled") || lowerMessage.includes("canceled")) {
    return "El ingreso con Google fue cancelado antes de completarse.";
  }

  return `No fue posible completar el ingreso con Google: ${message}`;
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
    const code = url.searchParams.get("code");

    async function handleCallback() {
      if (code) {
        const { error } = await authClient.auth.exchangeCodeForSession(code);

        if (error) {
          onError(normalizeOAuthErrorMessage(error.message));
          return;
        }

        onError(null);

        if (!error) {
          url.searchParams.delete("code");
          window.history.replaceState(window.history.state, "", url.toString());
        }

        return;
      }

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