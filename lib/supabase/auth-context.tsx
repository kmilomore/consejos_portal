"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Establishment, PortalScope, Profile } from "@/types/domain";

interface AuthResult {
  error?: string;
}

function normalizeAccessErrorMessage(rawMessage: string | null | undefined) {
  const message = (rawMessage ?? "").trim();
  const lowerMessage = message.toLowerCase();

  if (!message) {
    return "No fue posible validar tu acceso al portal."
  }

  if (
    lowerMessage.includes("no existe un perfil portal")
    || lowerMessage.includes("json object requested, multiple (or no) rows returned")
    || lowerMessage.includes("usuario_perfiles")
    || lowerMessage.includes("usuarios_perfiles")
  ) {
    return "Tu cuenta autenticada no tiene un perfil habilitado en el portal. Revisa que tu correo esté cargado en la base de accesos."
  }

  if (
    lowerMessage.includes("no se encontró el establecimiento asociado")
    || lowerMessage.includes("establecimiento asociado")
    || lowerMessage.includes("establecimientos")
  ) {
    return "Tu cuenta sí autenticó, pero no tiene una escuela vinculada para entrar al portal."
  }

  if (
    lowerMessage.includes("permission denied")
    || lowerMessage.includes("not authorized")
    || lowerMessage.includes("forbidden")
  ) {
    return "Tu cuenta autenticó, pero no tiene permisos para abrir este portal."
  }

  return `No fue posible abrir el portal: ${message}`;
}

const SELECTED_RBD_STORAGE_KEY = "consejos.portal.selected-rbd";
const AUTH_STATE_STORAGE_KEY = "consejos.portal.auth-state.v1";

interface AuthStateCache {
  session: Session | null;
  profile: Profile | null;
  establishment: Establishment | null;
  isGlobalAdmin: boolean;
  accessibleRbds: string[];
  canSelectSchool: boolean;
  landingRoute: "/admin/" | "/resumen/";
  accessError: string | null;
  profileLoaded: boolean;
}

const authStateCache: AuthStateCache = {
  session: null,
  profile: null,
  establishment: null,
  isGlobalAdmin: false,
  accessibleRbds: [],
  canSelectSchool: false,
  landingRoute: "/resumen/",
  accessError: null,
  profileLoaded: false,
};

function resetAuthStateCache() {
  authStateCache.session = null;
  authStateCache.profile = null;
  authStateCache.establishment = null;
  authStateCache.isGlobalAdmin = false;
  authStateCache.accessibleRbds = [];
  authStateCache.canSelectSchool = false;
  authStateCache.landingRoute = "/resumen/";
  authStateCache.accessError = null;
  authStateCache.profileLoaded = false;
}

function readStoredAuthState(): (AuthStateCache & { selectedRbd: string | null; allEstablishments: Establishment[] }) | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AUTH_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthStateCache & { selectedRbd: string | null; allEstablishments: Establishment[] };
  } catch {
    return null;
  }
}

function writeStoredAuthState(state: AuthStateCache & { selectedRbd: string | null; allEstablishments: Establishment[] }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(AUTH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures and keep the in-memory cache only.
  }
}

function resolveAuthRedirectUrl() {
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
  accessibleRbds: string[];
  canSelectSchool: boolean;
  landingRoute: "/admin/" | "/resumen/";
  isLoading: boolean;
  accessError: string | null;
  selectedRbd: string | null;
  setSelectedRbd: (rbd: string | null) => void;
  allEstablishments: Establishment[];
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(() => authStateCache.session ?? null);
  const [profile, setProfile] = useState<Profile | null>(() => authStateCache.profile ?? null);
  const [establishment, setEstablishment] = useState<Establishment | null>(() => authStateCache.establishment ?? null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(() => authStateCache.isGlobalAdmin);
  const [accessibleRbds, setAccessibleRbds] = useState<string[]>(() => authStateCache.accessibleRbds);
  const [canSelectSchool, setCanSelectSchool] = useState(() => authStateCache.canSelectSchool);
  const [landingRoute, setLandingRoute] = useState<"/admin/" | "/resumen/">(() => authStateCache.landingRoute);
  const [isLoading, setIsLoading] = useState(() => !authStateCache.profileLoaded);
  const [accessError, setAccessError] = useState<string | null>(() => authStateCache.accessError);
  const [selectedRbd, setSelectedRbd] = useState<string | null>(null);
  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([]);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const profileLoaded = useRef(authStateCache.profileLoaded);

  useEffect(() => {
    const storedAuthState = readStoredAuthState();

    if (storedAuthState) {
      setSession((current) => current ?? storedAuthState.session ?? null);
      setProfile((current) => current ?? storedAuthState.profile ?? null);
      setEstablishment((current) => current ?? storedAuthState.establishment ?? null);
      setIsGlobalAdmin((current) => current || storedAuthState.isGlobalAdmin || false);
      setAccessibleRbds((current) => current.length > 0 ? current : (storedAuthState.accessibleRbds ?? []));
      setCanSelectSchool((current) => current || storedAuthState.canSelectSchool || false);
      setLandingRoute((current) => current !== "/resumen/" ? current : (storedAuthState.landingRoute ?? "/resumen/"));
      setAccessError((current) => current ?? storedAuthState.accessError ?? null);
      setAllEstablishments((current) => current.length > 0 ? current : (storedAuthState.allEstablishments ?? []));
      setSelectedRbd((current) => current ?? storedAuthState.selectedRbd ?? null);

      if (storedAuthState.profileLoaded) {
        profileLoaded.current = true;
        setIsLoading(false);
      }
    }

    try {
      const storedRbd = window.localStorage.getItem(SELECTED_RBD_STORAGE_KEY);
      if (storedRbd) {
        setSelectedRbd((current) => current ?? storedRbd);
      }
    } catch {
      // localStorage may be unavailable; keep in-memory state only
    }

    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    if (!storageHydrated) {
      return;
    }

    authStateCache.session = session;
    authStateCache.profile = profile;
    authStateCache.establishment = establishment;
    authStateCache.isGlobalAdmin = isGlobalAdmin;
    authStateCache.accessibleRbds = accessibleRbds;
    authStateCache.canSelectSchool = canSelectSchool;
    authStateCache.landingRoute = landingRoute;
    authStateCache.accessError = accessError;
    authStateCache.profileLoaded = profileLoaded.current;

    writeStoredAuthState({
      session,
      profile,
      establishment,
      isGlobalAdmin,
      accessibleRbds,
      canSelectSchool,
      landingRoute,
      accessError,
      profileLoaded: profileLoaded.current,
      selectedRbd,
      allEstablishments,
    });
  }, [accessError, accessibleRbds, allEstablishments, canSelectSchool, establishment, isGlobalAdmin, landingRoute, profile, selectedRbd, session, storageHydrated]);

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

    const { data: subscription } = client.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      if (!mounted) {
        return;
      }

      if (nextSession) {
        setSession(nextSession);
      } else if (event === "SIGNED_OUT") {
        // Only wipe state on explicit sign-out, not on transient null events
        // (createBrowserClient fires INITIAL_SESSION with null before reading cookies)
        resetAuthStateCache();
        profileLoaded.current = false;
        setSession(null);
        setProfile(null);
        setEstablishment(null);
        setIsGlobalAdmin(false);
        setAccessibleRbds([]);
        setCanSelectSchool(false);
        setLandingRoute("/resumen/");
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

    if (profileLoaded.current && profile?.id === userId && (!profile.rbd || establishment)) {
      setIsLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;
    if (!profileLoaded.current) {
      setIsLoading(true);
    }
    setAccessError(null);

    async function loadAccess() {
      let bootstrapErrorMessage: string | null = null;

      let profileResult = await client
        .from("usuarios_perfiles")
        .select("id, correo_electronico, rol, rbd, comuna, nombre_director")
        .eq("id", userId)
        .single();

      if (profileResult.error || !profileResult.data) {
        const bootstrapResult = await client.rpc("bootstrap_current_user_profile_from_base_escuelas");

        if (bootstrapResult.error) {
          bootstrapErrorMessage = bootstrapResult.error.message;
        }

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
        setAccessError(normalizeAccessErrorMessage(
          bootstrapErrorMessage
            ?? profileResult.error?.message
            ?? "No existe un perfil portal vinculado a este usuario.",
        ));
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      const nextProfile = profileResult.data as Profile;
      let resolvedScope: PortalScope = {
        role_text: nextProfile.rol,
        is_global_admin: false,
        accessible_rbds: nextProfile.rbd ? [nextProfile.rbd] : [],
        default_rbd: nextProfile.rbd,
        can_select_school: false,
        landing_route: nextProfile.rbd ? "/resumen/" : "/admin/",
      };

      const scopeResult = await client.rpc("get_current_portal_scope");

      if (!cancelled && !scopeResult.error) {
        const scopeRow = Array.isArray(scopeResult.data)
          ? scopeResult.data[0]
          : scopeResult.data;

        if (scopeRow) {
          resolvedScope = {
            role_text: scopeRow.role_text,
            is_global_admin: Boolean(scopeRow.is_global_admin),
            accessible_rbds: Array.isArray(scopeRow.accessible_rbds)
              ? scopeRow.accessible_rbds.filter((value: unknown): value is string => typeof value === "string")
              : [],
            default_rbd: typeof scopeRow.default_rbd === "string" ? scopeRow.default_rbd : null,
            can_select_school: Boolean(scopeRow.can_select_school),
            landing_route: scopeRow.landing_route === "/admin" || scopeRow.landing_route === "/admin/" ? "/admin/" : "/resumen/",
          };
        }
      }

      setProfile(nextProfile);
      setIsGlobalAdmin(resolvedScope.is_global_admin);
      setAccessibleRbds(resolvedScope.accessible_rbds);
      setCanSelectSchool(resolvedScope.can_select_school);
      setLandingRoute(resolvedScope.landing_route);

      const establishmentRbd = nextProfile.rbd ?? resolvedScope.default_rbd;

      if (!establishmentRbd) {
        setEstablishment(null);
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      const establishmentResult = await client
        .from("establecimientos")
        .select("rbd, nombre, direccion, comuna")
        .eq("rbd", establishmentRbd)
        .single();

      if (cancelled) {
        return;
      }

      if (establishmentResult.error || !establishmentResult.data) {
        setEstablishment(null);
        setAccessError(normalizeAccessErrorMessage(establishmentResult.error?.message ?? "No se encontró el establecimiento asociado al perfil autenticado."));
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
  }, [establishment, profile, supabase, userId]);

  useEffect(() => {
    if (!session || isLoading) {
      return;
    }

    if (isGlobalAdmin) {
      return;
    }

    if (accessibleRbds.length === 1) {
      if (selectedRbd !== accessibleRbds[0]) {
        setSelectedRbd(accessibleRbds[0]);
      }
      return;
    }

    if (accessibleRbds.length === 0 && selectedRbd !== null) {
      setSelectedRbd(null);
      return;
    }

    if (selectedRbd && !accessibleRbds.includes(selectedRbd)) {
      setSelectedRbd(null);
    }
  }, [accessibleRbds, isGlobalAdmin, isLoading, selectedRbd, session]);

  useEffect(() => {
    if (!supabase || !isGlobalAdmin) {
      setAllEstablishments([]);
      return;
    }

    const client = supabase;
    client
      .from("establecimientos")
      .select("rbd, nombre, direccion, comuna")
      .order("nombre", { ascending: true })
      .then(({ data }: { data: Establishment[] | null }) => {
        setAllEstablishments((data as Establishment[]) ?? []);
      });
  }, [isGlobalAdmin, profile, supabase]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (!session || !profile) {
        return;
      }

      if (landingRoute !== "/admin/") {
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
  }, [landingRoute, profile, selectedRbd, session]);

  async function signInWithGoogle(): Promise<AuthResult> {
    if (!supabase) {
      return { error: "Supabase no está disponible en este navegador." };
    }

    const allowedDomain = (process.env.NEXT_PUBLIC_AUTH_ALLOWED_DOMAIN ?? "@slepcolchagua.cl")
      .replace(/^@/, "")
      .toLowerCase();

    const redirectTo = resolveAuthRedirectUrl();

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

    resetAuthStateCache();

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
        accessibleRbds,
        canSelectSchool,
        landingRoute,
        isLoading,
        accessError,
        selectedRbd,
        setSelectedRbd,
        allEstablishments,
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