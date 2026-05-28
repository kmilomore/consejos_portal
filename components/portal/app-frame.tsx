"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { usePortalAuth } from "@/lib/auth/context";
import { PortalSnapshotProvider } from "@/lib/hooks/use-portal-snapshot";
import { PortalShell } from "@/components/portal/shell";

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path : `${path}/`;
}

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, establishment, isLoading, isSessionReady, accessError, signOut, landingRoute } = usePortalAuth();
  const isAuthEntry = pathname === "/" || pathname.startsWith("/auth/login");
  const isLoginRoute = pathname.startsWith("/auth/login");
  const normalizedPathname = normalizePath(pathname);

  useEffect(() => {
    if (!isSessionReady || isLoading) return;

    if (!session && !isAuthEntry) {
      router.replace("/");
      return;
    }

    if (session && isAuthEntry && !isLoginRoute) {
      if (normalizedPathname !== landingRoute) {
        router.replace(landingRoute);
      }
    }
  }, [isAuthEntry, isLoading, isLoginRoute, isSessionReady, landingRoute, normalizedPathname, router, session]);

  useEffect(() => {
    if (!session || !accessError) {
      return;
    }

    toast(accessError, "error");
  }, [accessError, session]);

  // Auth entry: render login page directly. No loader, no banners.
  if (isAuthEntry) {
    if (isLoginRoute) {
      return <>{children}</>;
    }

    if (session) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-md rounded-modal border border-neutral-200 bg-white p-8 text-center shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Acceso</p>
            <p className="mt-4 text-lg font-semibold text-ink">Redirigiendo al portal</p>
            <p className="mt-2 text-sm text-neutral-500">
              Tu sesión ya fue validada. Si la navegación no avanza, abre directamente la ruta {landingRoute}.
            </p>
            {normalizedPathname !== landingRoute && (
              <div className="mt-6">
                <Button onClick={() => router.replace(landingRoute)}>Entrar ahora</Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // Not authenticated yet — wait silently.
  if (!isSessionReady || !session) return null;

  // Authenticated — always wrap in PortalSnapshotProvider so it never unmounts during
  // auth-state transitions (profile loading, token refresh, etc.).
  return (
    <PortalSnapshotProvider>
      {/* Only show shell skeleton on the very first auth bootstrap when no profile is cached yet. */}
      {!profile && isLoading && !accessError ? (
        <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-3 lg:flex-row lg:px-4 lg:py-4 2xl:px-6">
          <div className="skeleton-shimmer h-24 w-full rounded-[30px] lg:h-[calc(100vh-2rem)] lg:w-[320px] xl:w-[336px]" />
          <div className="skeleton-shimmer min-w-0 flex-1 rounded-[32px] lg:min-h-[calc(100vh-2rem)]" />
        </div>
      ) : !profile || accessError ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-xl rounded-modal border border-neutral-200 bg-white p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Acceso</p>
            <div className="mt-3">
              <Alert
                tone="danger"
                variant="tinted"
                title="No fue posible abrir el portal de la escuela"
              >
                <p>{accessError ?? "El usuario autenticado no tiene perfil o establecimiento vinculado en Supabase."}</p>
              </Alert>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => void signOut()}>Cerrar sesión</Button>
              <Button variant="secondary" onClick={() => router.replace("/")}>Volver al ingreso</Button>
            </div>
          </div>
        </div>
      ) : (
        <PortalShell profile={profile} establishment={establishment}>
          {children}
        </PortalShell>
      )}
    </PortalSnapshotProvider>
  );
}