"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { PortalSnapshotProvider } from "@/lib/supabase/use-portal-snapshot";
import { PortalShell } from "@/components/portal/shell";

export function AppFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile, establishment, isLoading, accessError, signOut, landingRoute } = usePortalAuth();
  const isAuthEntry = pathname === "/" || pathname.startsWith("/auth/login");

  useEffect(() => {
    if (isLoading) return;

    if (!session && !isAuthEntry) {
      router.replace("/");
      return;
    }

    if (session && isAuthEntry) {
      router.replace(landingRoute);
    }
  }, [isAuthEntry, isLoading, landingRoute, pathname, router, session]);

  // Auth entry: render login page directly. No loader, no banners.
  if (isAuthEntry) {
    if (session) return null;
    return <>{children}</>;
  }

  // Not authenticated yet — wait silently.
  if (!session) return null;

  // Authenticated — always wrap in PortalSnapshotProvider so it never unmounts during
  // auth-state transitions (profile loading, token refresh, etc.).
  return (
    <PortalSnapshotProvider>
      {/* Session exists but profile still loading — persistent shell skeleton so layout never flashes */}
      {isLoading || (!profile && !accessError) ? (
        <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-3 lg:flex-row lg:px-4 lg:py-4 2xl:px-6">
          <div className="skeleton-shimmer h-24 w-full rounded-[30px] lg:h-[calc(100vh-2rem)] lg:w-[320px] xl:w-[336px]" />
          <div className="skeleton-shimmer min-w-0 flex-1 rounded-[32px] lg:min-h-[calc(100vh-2rem)]" />
        </div>
      ) : !profile || accessError ? (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">Acceso</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">No fue posible abrir el portal de la escuela</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {accessError ?? "El usuario autenticado no tiene perfil o establecimiento vinculado en Supabase."}
            </p>
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