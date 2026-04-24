"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Establishment, Profile } from "@/types/domain";

interface AuthResult {
  error?: string;
}

const SELECTED_RBD_STORAGE_KEY = "consejos.portal.selected-rbd";

function resolveOtpRedirectUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return new URL("/auth/login/", configuredSiteUrl).toString();
  }

  if (typeof window !== "undefined") {
    return new URL("/auth/login/", window.location.origin).toString();
  }

  return undefined;
}

interface PortalAuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  establishment: Establishment | null;
  isGlobalAdmin: boolean;
  isLoading: boolean;
  accessError: string | null;
  selectedRbd: string | null;
  setSelectedRbd: (rbd: string | null) => void;
  allEstablishments: Establishment[];
  sendOtp: (email: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedRbd, setSelectedRbd] = useState<string | null>(null);
  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([]);
  const profileLoaded = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedRbd = window.localStorage.getItem(SELECTED_RBD_STORAGE_KEY);
      if (storedRbd) {
        setSelectedRbd(storedRbd);
      }
    } catch {
      // localStorage may be unavailable; keep in-memory state only
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAccessError("No se pudo inicializar el cliente de Supabase en el navegador.");
      setIsLoading(false);
      return;
    }

    const client = supabase;
    let mounted = true;

    async function bootstrapSession() {
      const { data, error } = await client.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        setAccessError(error.message);
      }

      setSession(data.session ?? null);
      if (!data.session) {
        setProfile(null);
        setEstablishment(null);
        setIsLoading(false);
      }
    }

    void bootstrapSession();

    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) {
        return;
      }

      if (nextSession) {
        setSession(nextSession);
      } else if (event === "SIGNED_OUT") {
        // Only wipe state on explicit sign-out, not on transient null events
        // (createBrowserClient fires INITIAL_SESSION with null before reading cookies)
        profileLoaded.current = false;
        setSession(null);
        setProfile(null);
        setEstablishment(null);
        setIsGlobalAdmin(false);
        setAccessError(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    if (!userId) {
      return;
    }

    const client = supabase;
    let cancelled = false;
    if (!profileLoaded.current) {
      setIsLoading(true);
    }
    setAccessError(null);

    async function loadAccess() {
      let profileResult = await client
        .from("usuarios_perfiles")
        .select("id, correo_electronico, rol, rbd, comuna, nombre_director")
        .eq("id", userId)
        .single();

      if (profileResult.error || !profileResult.data) {
        const bootstrapResult = await client.rpc("bootstrap_current_user_profile_from_base_escuelas");

        if (!cancelled && !bootstrapResult.error) {
          profileResult = await client
            .from("usuarios_perfiles")
            .select("id, correo_electronico, rol, rbd, comuna, nombre_director")
            .eq("id", userId)
            .single();
        }
      }

      if (cancelled) {
        return;
      }

      if (profileResult.error || !profileResult.data) {
        setProfile(null);
        setEstablishment(null);
        setAccessError(profileResult.error?.message ?? "No existe un perfil portal vinculado a este usuario.");
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      const nextProfile = profileResult.data as Profile;
      let nextIsGlobalAdmin = false;

      if (nextProfile.rol === "ADMIN") {
        const globalAdminResult = await client.rpc("is_global_admin");

        if (!cancelled && !globalAdminResult.error) {
          nextIsGlobalAdmin = Boolean(globalAdminResult.data);
        }
      }

      setProfile(nextProfile);
      setIsGlobalAdmin(nextIsGlobalAdmin);

      if (!nextProfile.rbd) {
        setEstablishment(null);
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      const establishmentResult = await client
        .from("establecimientos")
        .select("rbd, nombre, direccion, comuna")
        .eq("rbd", nextProfile.rbd)
        .single();

      if (cancelled) {
        return;
      }

      if (establishmentResult.error || !establishmentResult.data) {
        setEstablishment(null);
        setAccessError(establishmentResult.error?.message ?? "No se encontró el establecimiento asociado al perfil autenticado.");
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      setEstablishment(establishmentResult.data as Establishment);
      profileLoaded.current = true;
      setIsLoading(false);
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  useEffect(() => {
    if (!supabase || profile?.rol !== "ADMIN") {
      setAllEstablishments([]);
      return;
    }

    const client = supabase;
    client
      .from("establecimientos")
      .select("rbd, nombre, direccion, comuna")
      .order("nombre", { ascending: true })
      .then(({ data }) => {
        setAllEstablishments((data as Establishment[]) ?? []);
      });
  }, [profile, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (!session || !profile) {
        return;
      }

      if (profile.rol !== "ADMIN") {
        window.localStorage.removeItem(SELECTED_RBD_STORAGE_KEY);
        if (selectedRbd !== null) {
          setSelectedRbd(null);
        }
        return;
      }

      if (selectedRbd) {
        window.localStorage.setItem(SELECTED_RBD_STORAGE_KEY, selectedRbd);
      } else {
        window.localStorage.removeItem(SELECTED_RBD_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable; ignore silently
    }
  }, [profile, selectedRbd, session]);

  async function sendOtp(email: string): Promise<AuthResult> {
    if (!supabase) {
      return { error: "Supabase no está disponible en este navegador." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = resolveOtpRedirectUrl();

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async function verifyOtp(email: string, token: string): Promise<AuthResult> {
    if (!supabase) {
      return { error: "Supabase no está disponible en este navegador." };
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "email",
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }

    return {};
  }

  async function signInWithGoogle(): Promise<AuthResult> {
    if (!supabase) {
      return { error: "Supabase no está disponible en este navegador." };
    }

    const allowedDomain = (process.env.NEXT_PUBLIC_AUTH_ALLOWED_DOMAIN ?? "@slepcolchagua.cl")
      .replace(/^@/, "")
      .toLowerCase();

    const redirectTo = resolveOtpRedirectUrl();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: allowedDomain
          ? { hd: allowedDomain, prompt: "select_account" }
          : { prompt: "select_account" },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SELECTED_RBD_STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable; ignore silently
    }

    await supabase.auth.signOut();
  }

  return (
    <PortalAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        establishment,
        isGlobalAdmin,
        isLoading,
        accessError,
        selectedRbd,
        setSelectedRbd,
        allEstablishments,
        sendOtp,
        verifyOtp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);

  if (!context) {
    throw new Error("usePortalAuth debe usarse dentro de PortalAuthProvider.");
  }

  return context;
}