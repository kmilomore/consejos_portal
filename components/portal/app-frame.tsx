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
  const { session, profile, establishment, isLoading, accessError, signOut } = usePortalAuth();
  const isAuthEntry = pathname === "/" || pathname.startsWith("/auth/login");

  useEffect(() => {
    if (isLoading) return;

    if (!session && !isAuthEntry) {
      router.replace("/");
      return;
    }

    if (session && isAuthEntry) {
      router.replace(profile?.rol === "ADMIN" ? "/admin" : "/resumen");
    }
  }, [isAuthEntry, isLoading, pathname, profile?.rol, router, session]);

  // Auth entry: render login page directly. No loader, no banners.
  if (isAuthEntry) {
    if (session) return null;
    return <>{children}</>;
  }

  // Any other route: silently wait for session + profile resolution (no loader, no banner).
  if (!session) return null;
  if (isLoading) return null;

  if (!profile || accessError) {
    return (
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
    );
  }

  return (
    <PortalSnapshotProvider>
      <PortalShell profile={profile} establishment={establishment}>
        {children}
      </PortalShell>
    </PortalSnapshotProvider>
  );
}