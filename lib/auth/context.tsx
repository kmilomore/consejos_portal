"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_KEYS } from "@/lib/constants";
import type { Establishment, PortalScope, Profile } from "@/types/domain";

const LOAD_ACCESS_TIMEOUT_MS = 15_000;

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

interface StoredAuthState extends Omit<AuthStateCache, "session"> {
  userId: string;
  selectedRbd: string | null;
  allEstablishments: Establishment[];
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

function readStoredAuthState(): StoredAuthState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEYS.AUTH_STATE);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredAuthState;
  } catch {
    return null;
  }
}

function writeStoredAuthState(state: StoredAuthState, lastRef: React.MutableRefObject<string | null>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = JSON.stringify(state);
    if (serialized === lastRef.current) {
      return;
    }
    lastRef.current = serialized;
    window.sessionStorage.setItem(STORAGE_KEYS.AUTH_STATE, serialized);
  } catch {
    // Ignore storage write failures and keep the in-memory cache only.
  }
}

function clearStoredAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function resolveAuthRedirectUrl() {
  if (typeof window !== "undefined") {
    return new URL("/auth/login/", window.location.origin).toString();
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return new URL("/auth/login/", configuredSiteUrl).toString();
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
  const storedAuthStateRef = useRef<StoredAuthState | null>(null);
  const appliedStoredAuthUserIdRef = useRef<string | null>(null);
  const lastWrittenAuthStateRef = useRef<string | null>(null);

  useEffect(() => {
    const storedAuthState = readStoredAuthState();
    storedAuthStateRef.current = storedAuthState;

    try {
      const storedRbd = window.localStorage.getItem(STORAGE_KEYS.SELECTED_RBD);
      if (storedRbd) {
        setSelectedRbd((current) => current ?? storedRbd);
      }
    } catch {
      // localStorage may be unavailable; keep in-memory state only
    }

    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    const sessionUserId = session?.user?.id ?? null;

    if (!storageHydrated || !sessionUserId) {
      return;
    }

    if (appliedStoredAuthUserIdRef.current === sessionUserId) {
      return;
    }

    appliedStoredAuthUserIdRef.current = sessionUserId;

    const storedAuthState = storedAuthStateRef.current;
    if (!storedAuthState || storedAuthState.userId !== sessionUserId) {
      return;
    }

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
  }, [session, storageHydrated]);

  // Sync in-memory + sessionStorage cache. Uses a ref-based comparison to skip
  // writes when state hasn't actually changed between render cycles.
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

    const sessionUserId = session?.user?.id ?? null;

    if (!sessionUserId) {
      lastWrittenAuthStateRef.current = null;
      clearStoredAuthState();
      return;
    }

    writeStoredAuthState(
      {
        userId: sessionUserId,
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
      },
      lastWrittenAuthStateRef,
    );
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
        lastWrittenAuthStateRef.current = null;
        setSession(null);
        setProfile(null);
        setEstablishment(null);
        setIsGlobalAdmin(false);
        setAccessibleRbds([]);
        setCanSelectSchool(false);
        setLandingRoute("/resumen/");
        setAccessError(null);
        setIsLoading(false);
        clearStoredAuthState();
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

    // Capture the narrowed string before entering async closures — TypeScript cannot
    // propagate narrowing of outer-scope variables through async functions.
    const uid = userId;

    // Abort the load after 15s to avoid an infinite spinner on network issues.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setAccessError("El portal tardó demasiado en cargar. Recarga la página e intenta de nuevo.");
        profileLoaded.current = true;
        setIsLoading(false);
      }
    }, LOAD_ACCESS_TIMEOUT_MS);

    async function loadAccess() {
      let bootstrapErrorMessage: string | null = null;

      // Fetch profile, with one bootstrap+retry if the first query finds no row.
      // Extracted into a const-returning helper so TypeScript can narrow the
      // discriminated union on the result without `let`-reassignment confusion.
      async function fetchProfileData() {
        const first = await client
          .from("usuarios_perfiles")
          .select("id, correo_electronico, rol, rbd, comuna, nombre_director")
          .eq("id", uid)
          .single();

        if (!first.error && first.data) {
          return first;
        }

        const bootstrap = await client.rpc("bootstrap_current_user_profile_from_base_escuelas");
        if (bootstrap.error) {
          bootstrapErrorMessage = bootstrap.error.message;
          return first;
        }

        if (cancelled) {
          return first;
        }

        return client
          .from("usuarios_perfiles")
          .select("id, correo_electronico, rol, rbd, comuna, nombre_director")
          .eq("id", uid)
          .single();
      }

      const profileResult = await fetchProfileData();

      if (cancelled) {
        return;
      }

      // Extract primitives before narrowing: TypeScript cannot narrow the Supabase
      // PostgrestSingleResponse<T> discriminated union reliably without database
      // type generation, causing `.data` to collapse to `never` after the guard.
      const profileData = profileResult.data as Profile | null;
      const profileError = profileResult.error;

      if (profileError || !profileData) {
        setProfile(null);
        setEstablishment(null);
        setAccessError(normalizeAccessErrorMessage(
          bootstrapErrorMessage
            ?? profileError?.message
            ?? "No existe un perfil portal vinculado a este usuario.",
        ));
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      const nextProfile = profileData;
      let resolvedScope: PortalScope = {
        role_text: nextProfile.rol,
        is_global_admin: false,
        accessible_rbds: nextProfile.rbd ? [nextProfile.rbd] : [],
        default_rbd: nextProfile.rbd,
        can_select_school: false,
        landing_route: nextProfile.rbd ? "/resumen/" : "/admin/",
      };

      // Run scope resolution and establishment fetch in parallel when the rbd
      // is already known from the profile (covers all director-role users).
      const profileRbd = nextProfile.rbd;
      const [scopeResult, earlyEstResult] = await Promise.all([
        client.rpc("get_current_portal_scope"),
        profileRbd
          ? client.from("establecimientos").select("rbd, nombre, direccion, comuna").eq("rbd", profileRbd).single()
          : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      // Cast RPC data to unknown first — without database type generation Supabase's
      // generic response types collapse to `never` when TypeScript tries to narrow them.
      if (!scopeResult.error) {
        const rawData = scopeResult.data as unknown;
        const scopeRow = (Array.isArray(rawData) ? rawData[0] : rawData) as Record<string, unknown> | null | undefined;

        if (scopeRow) {
          resolvedScope = {
            role_text: typeof scopeRow.role_text === "string" ? scopeRow.role_text : nextProfile.rol,
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

      const establishmentRbd = profileRbd ?? resolvedScope.default_rbd;

      if (!establishmentRbd) {
        setEstablishment(null);
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      // Use the already-fetched result when the rbd came from the profile;
      // otherwise fall back to a fresh query (admin with a non-null default_rbd).
      const rawEstResult = earlyEstResult
        ?? (cancelled
          ? null
          : await client.from("establecimientos").select("rbd, nombre, direccion, comuna").eq("rbd", establishmentRbd).single());

      if (cancelled) {
        return;
      }

      // Extract via unknown to avoid the same Supabase generic narrowing issue.
      const estData = (rawEstResult as { data?: unknown } | null)?.data as Establishment | null | undefined;
      const estError = (rawEstResult as { error?: { message: string } | null } | null)?.error;

      if (!estData) {
        setEstablishment(null);
        setAccessError(normalizeAccessErrorMessage(
          estError?.message ?? "No se encontró el establecimiento asociado al perfil autenticado.",
        ));
        profileLoaded.current = true;
        setIsLoading(false);
        return;
      }

      setEstablishment(estData);
      profileLoaded.current = true;
      setIsLoading(false);
    }

    void loadAccess();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
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
        window.localStorage.removeItem(STORAGE_KEYS.SELECTED_RBD);
        if (selectedRbd !== null) {
          setSelectedRbd(null);
        }
        return;
      }

      if (selectedRbd) {
        window.localStorage.setItem(STORAGE_KEYS.SELECTED_RBD, selectedRbd);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.SELECTED_RBD);
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
    lastWrittenAuthStateRef.current = null;

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.SELECTED_RBD);
      }
    } catch {
      // localStorage may be unavailable; ignore silently
    }

    clearStoredAuthState();

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
