"use client";

import { useState } from "react";
import authBackground from "@/app/auth/auth.webp";
import { usePortalAuth } from "@/lib/supabase/auth-context";

const ALLOWED_DOMAIN =
  (process.env.NEXT_PUBLIC_AUTH_ALLOWED_DOMAIN ?? "@slepcolchagua.cl").toLowerCase();

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-control bg-ink px-6 py-4 text-base font-bold text-white shadow-md transition hover:bg-navy-700 active:scale-[0.98] disabled:opacity-50"
    >
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.805 10.023H12v3.955h5.627c-.242 1.272-.968 2.35-2.056 3.074v2.553h3.326c1.946-1.79 3.063-4.427 3.063-7.563 0-.682-.061-1.336-.155-2.019z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.964-.894 6.617-2.395l-3.326-2.553c-.922.62-2.1.988-3.291.988-2.53 0-4.673-1.707-5.439-4.002H3.126v2.608A10 10 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.561 14.038A5.996 5.996 0 0 1 6.257 12c0-.708.121-1.395.304-2.038V7.354H3.126A9.998 9.998 0 0 0 2 12c0 1.612.386 3.138 1.126 4.646l3.435-2.608z" />
        <path fill="#EA4335" d="M12 5.96c1.467 0 2.783.505 3.819 1.496l2.864-2.864C16.959 2.987 14.695 2 12 2a10 10 0 0 0-8.874 5.354l3.435 2.608C7.327 7.667 9.47 5.96 12 5.96z" />
      </svg>
      Ingresar con Google
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function AuthScreen() {
  const { signInWithGoogle, isLoading } = usePortalAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    setFeedback(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setFeedback("Redirigiendo a Google para autenticar tu cuenta institucional.");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-900 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBackground.src})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,20,0.56),rgba(5,10,20,0.82)_52%,rgba(5,10,20,0.96))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,105,180,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(255,29,61,0.08),transparent_26%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[460px]">
          <div className="rounded-modal border border-white/10 bg-white p-6 text-ink shadow-xl sm:p-8">
            <div className="h-1.5 w-20 rounded-full bg-ocean" />

            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-ocean">Consejos Escolares</p>
              <h1 className="font-display mt-5 text-5xl font-black leading-[0.9] tracking-[-0.05em] text-ink sm:text-[3.8rem]">
                Acceso.
              </h1>
              <p className="mt-4 text-sm font-medium leading-7 text-neutral-600">
                Portal de Consejos Escolares · SLEP Colchagua
              </p>
              <p className="mt-3 text-sm font-medium leading-7 text-neutral-500">
                Ingresa con tu cuenta institucional de Google {ALLOWED_DOMAIN}.
              </p>
            </div>

            {feedback && (
              <div className="mt-6 rounded-card border border-status-info bg-status-info-bg px-4 py-3 text-sm font-bold leading-7 text-status-info">
                {feedback}
              </div>
            )}
            {errorMessage && (
              <div className="mt-6 rounded-card border border-status-danger bg-status-danger-bg px-4 py-3 text-sm font-bold leading-7 text-status-danger">
                {errorMessage}
              </div>
            )}

            <div className="mt-8 space-y-5">
              <GoogleButton onClick={() => { void handleGoogleSignIn(); }} disabled={isLoading} />
              <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Acceso habilitado solo con Google Workspace
              </p>
            </div>

            <p className="mt-7 border-t border-neutral-200 pt-5 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
              Acceso restringido · {ALLOWED_DOMAIN}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
