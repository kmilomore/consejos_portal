"use client";

import { useEffect } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackHandler() {
  useEffect(() => {
    const client = createClient();

    if (!client) {
      return;
    }

    const authClient = client;
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    async function handleCallback() {
      if (code) {
        const { error } = await authClient.auth.exchangeCodeForSession(code);

        if (!error) {
          url.searchParams.delete("code");
          window.history.replaceState(window.history.state, "", url.toString());
        }

        return;
      }
    }

    void handleCallback();
  }, []);

  return null;
}

export default function LoginPage() {
  return (
    <>
      <AuthCallbackHandler />
      <AuthScreen />
    </>
  );
}