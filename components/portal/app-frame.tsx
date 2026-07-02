"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { usePortalAuth } from "@/lib/auth/context";
import { PortalSnapshotProvider } from "@/lib/hooks/use-portal-snapshot";
import { PortalShell } from "@/components/portal/shell";

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, establishment, isLoading, isSessionReady, accessError, signOut } = usePortalAuth();
  // "/" is the public landing page — always rendered, with or without session.
  const isLandingRoute = pathname === "/";
  const isLoginRoute = pathname.startsWith("/auth/login");
  const isLegalRoute =
    pathname.startsWith("/terminos") || pathname.startsWith("/privacidad") || pathname.startsWith("/cookies");
  const isPublicRoute = isLandingRoute || isLoginRoute || isLegalRoute;

  useEffect(() => {
    if (!isSessionReady || isLoading) return;

    if (!session && !isPublicRoute) {
      router.replace("/auth/login/");
    }
  }, [isLoading, isPublicRoute, isSessionReady, router, session]);

  useEffect(() => {
    if (!session || !accessError) {
      return;
    }

    toast(accessError, "error");
  }, [accessError, session]);

  // Public routes (landing + login) render directly. No loader, no banners.
  // The login page handles its own redirect when a session already exists.
  if (isPublicRoute) {
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
              <Button variant="secondary" onClick={() => router.replace("/auth/login/")}>Volver al ingreso</Button>
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