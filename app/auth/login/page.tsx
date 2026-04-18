"use client";

import { useEffect } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
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
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;

    async function handleCallback() {
      if (code) {
        const { error } = await authClient.auth.exchangeCodeForSession(code);

        if (!error) {
          url.searchParams.delete("code");
          window.history.replaceState(window.history.state, "", url.toString());
        }

        return;
      }

      if (tokenHash && type) {
        const { error } = await authClient.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (!error) {
          url.searchParams.delete("token_hash");
          url.searchParams.delete("type");
          window.history.replaceState(window.history.state, "", url.toString());
        }
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