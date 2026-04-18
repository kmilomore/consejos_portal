"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import authBackground from "@/app/auth/auth.webp";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/lib/supabase/auth-context";

const storedEmailKey = "consejos.auth.email";
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

const ALLOWED_DOMAIN =
  (process.env.NEXT_PUBLIC_AUTH_ALLOWED_DOMAIN ?? "@slepcolchagua.cl").toLowerCase();

// ── OTP Input ──────────────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("").slice(0, 6);
    arr[index] = digit || " ";
    const newVal = arr.join("").trimEnd();
    onChange(newVal);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[index] && value[index] !== " ") {
        const arr = value.padEnd(6, " ").split("");
        arr[index] = " ";
        onChange(arr.join("").trimEnd());
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] && value[i] !== " " ? value[i] : ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={`h-14 w-12 rounded-2xl border-2 text-center text-2xl font-black text-slate-950 outline-none transition-all caret-transparent
            ${disabled
              ? "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
              : "border-slate-200 bg-white focus:border-ocean focus:ring-4 focus:ring-ocean/20 hover:border-slate-300"
            }`}
        />
      ))}
    </div>
  );
}

// ── Google sign-in button ──────────────────────────────────────────────────
function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-ink px-6 py-4 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
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
  const { sendOtp, verifyOtp, signInWithGoogle, isLoading } = usePortalAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [showEmail, setShowEmail] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const isLocked = !!lockoutUntil && lockoutSeconds > 0;

  useEffect(() => {
    const storedEmail = window.localStorage.getItem(storedEmailKey);
    if (storedEmail) {
      setEmail(storedEmail);
      setOtpStep("verify");
      setShowEmail(true);
    }
  }, []);

  // Countdown del bloqueo
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000));
      setLockoutSeconds(remaining);
      if (remaining === 0) {
        setLockoutUntil(null);
        setFailedAttempts(0);
        setErrorMessage(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    setFeedback(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setErrorMessage(result.error);
    }
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFeedback(null);

    if (!email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      setErrorMessage(`Solo se permiten correos institucionales ${ALLOWED_DOMAIN}`);
      return;
    }

    const result = await sendOtp(email);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    window.localStorage.setItem(storedEmailKey, normalizedEmail);
    setEmail(normalizedEmail);
    setOtpStep("verify");
    setFeedback("Te enviamos un código de 6 dígitos a tu correo. Revisa bandeja principal y spam.");
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLocked) return;
    setErrorMessage(null);
    setFeedback(null);

    const result = await verifyOtp(email, code.replace(/\s/g, ""));

    if (result.error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setCode("");

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = new Date(Date.now() + LOCKOUT_SECONDS * 1000);
        setLockoutUntil(until);
        setLockoutSeconds(LOCKOUT_SECONDS);
        setErrorMessage(`Demasiados intentos. Bloqueado por ${LOCKOUT_SECONDS} segundos.`);
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts;
        setErrorMessage(
          `Código incorrecto. ${remaining} intento${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}.`
        );
      }
      return;
    }

    window.localStorage.removeItem(storedEmailKey);
    setFeedback("Autenticación correcta. Ingresando al portal…");
  }

  function resetEmail() {
    window.localStorage.removeItem(storedEmailKey);
    setOtpStep("request");
    setCode("");
    setFeedback(null);
    setErrorMessage(null);
    setFailedAttempts(0);
    setLockoutUntil(null);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${authBackground.src})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,20,0.56),rgba(5,10,20,0.82)_52%,rgba(5,10,20,0.96))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,105,180,0.18),transparent_22%),radial-gradient(circle_at_bottom,rgba(255,29,61,0.08),transparent_26%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-[460px]">
          <div className="rounded-[34px] border border-white/10 bg-white p-6 text-ink shadow-[0_28px_100px_rgba(5,10,20,0.42)] sm:p-8">
            <div className="h-1.5 w-20 rounded-full bg-ocean" />

            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-ocean">Consejos Escolares</p>
              <h1 className="font-display mt-5 text-5xl font-black leading-[0.9] tracking-[-0.05em] text-[#0b1526] sm:text-[3.8rem]">
                Acceso.
              </h1>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Portal de Consejos Escolares · SLEP Colchagua
              </p>
            </div>

            {/* Alerts */}
            {feedback && (
              <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold leading-7 text-sky-800">
                {feedback}
              </div>
            )}
            {errorMessage && (
              <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${
                isLocked
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                {errorMessage}
                {isLocked && (
                  <div className="mt-1 text-3xl font-black tabular-nums text-amber-500">
                    {lockoutSeconds}s
                  </div>
                )}
              </div>
            )}

            <div className="mt-8">
              {/* OTP verify step */}
              {otpStep === "verify" && showEmail ? (
                <form className="space-y-6" onSubmit={(e) => void handleVerifyOtp(e)}>
                  <div className="space-y-3">
                    <p className="text-center text-xs font-semibold text-slate-500">
                      Código enviado a <span className="text-ink">{email}</span>
                    </p>
                    <OtpInput value={code} onChange={setCode} disabled={isLocked || isLoading} />
                    {failedAttempts > 0 && !isLocked && (
                      <div className="mt-3 flex justify-center gap-1">
                        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1 w-8 rounded-full transition-all ${i < failedAttempts ? "bg-rose-400" : "bg-slate-200"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full justify-center gap-2 rounded-[20px] px-6 py-4 text-base font-black"
                      disabled={isLoading || isLocked || code.replace(/\s/g, "").length < 6}
                    >
                      {isLocked ? `Bloqueado — ${lockoutSeconds}s` : "Verificar e ingresar"}
                      {!isLocked && <ArrowRight className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full justify-center rounded-[20px] border border-rose-200 bg-rose-50 px-6 py-4 text-base font-bold text-rose-600 ring-0 hover:bg-rose-100"
                      onClick={resetEmail}
                    >
                      Cambiar correo
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* PRIMARY: Google */}
                  <GoogleButton onClick={() => { void handleGoogleSignIn(); }} disabled={isLoading} />

                  {/* SECONDARY: email/OTP collapsible */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowEmail((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-600"
                    >
                      {showEmail ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {showEmail ? "Ocultar acceso por correo" : "Ingresar con correo institucional"}
                    </button>

                    {showEmail && (
                      <form className="mt-4 space-y-4" onSubmit={(e) => void handleRequestOtp(e)}>
                        <label className="block">
                          <span className="text-sm font-bold tracking-[0.01em] text-ink">Correo institucional</span>
                          <input
                            type="email"
                            required
                            autoComplete="email"
                            placeholder={`director${ALLOWED_DOMAIN}`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-ocean"
                          />
                        </label>
                        <Button
                          type="submit"
                          variant="secondary"
                          className="w-full justify-center gap-2 rounded-[20px] px-6 py-4 text-base font-bold"
                          disabled={isLoading || email.trim().length === 0}
                        >
                          Enviar código al correo
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-7 border-t border-slate-200 pt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Acceso restringido · {ALLOWED_DOMAIN}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
