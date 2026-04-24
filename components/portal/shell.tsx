"use client";

import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Search,
  School2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePortalAuth } from "@/lib/supabase/auth-context";
import { useSlepDirectorio } from "@/lib/supabase/use-slep-directorio";
import { cn } from "@/lib/utils";
import type { Establishment, Profile } from "@/types/domain";

const directorNavigation = [
  { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  { href: "/programacion", label: "Programación", icon: CalendarRange },
  { href: "/actas", label: "Actas", icon: FileText },
  { href: "/metricas", label: "Métricas", icon: LockKeyhole },
];

const adminNavigation = [
  { href: "/admin", label: "Panel General", icon: LayoutGrid },
  { href: "/resumen", label: "Resumen EE", icon: LayoutDashboard },
  { href: "/programacion", label: "Programación", icon: CalendarRange },
  { href: "/actas", label: "Actas", icon: FileText },
  { href: "/metricas", label: "Métricas", icon: LockKeyhole },
];

// ── School selector (admin only) ───────────────────────────────────────────
function SchoolSelector({
  selectedRbd,
  onSelect,
}: {
  selectedRbd: string | null;
  onSelect: (rbd: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { data: schools, isLoading } = useSlepDirectorio();
  const current = schools.find((e) => e.rbd === selectedRbd) ?? null;
  const filteredSchools = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return schools;
    }

    return schools.filter((school) => {
      return [
        school.nombre_establecimiento,
        school.rbd,
        school.comuna,
        school.director,
        school.representante_consejo,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [schools, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    inputRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(rbd: string | null) {
    onSelect(rbd);
    setSearchQuery("");
    setOpen(false);

    if (rbd) {
      router.push("/resumen");
      return;
    }

    router.push("/admin");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ocean/30"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ocean/10 text-ocean">
          <School2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Escuela activa</p>
          <p className="truncate text-sm font-semibold text-ink">
            {isLoading ? "Cargando…" : (current?.nombre_establecimiento ?? "Selecciona una escuela")}
          </p>
          {current && (
            <p className="text-[11px] text-slate-400">RBD {current.rbd} · {current.comuna}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-[20px] border border-slate-200 bg-white py-2 shadow-[0_16px_48px_rgba(11,21,38,0.16)]">
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Escribe nombre, RBD o comuna"
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-ink outline-none transition focus:border-ocean focus:bg-white focus:ring-2 focus:ring-ocean/15"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50",
              !selectedRbd ? "font-semibold text-ocean" : "text-slate-700",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ocean/40" />
            Volver al panel general
          </button>

          <div className="mx-3 my-1.5 border-t border-slate-100" />

          {filteredSchools.map((est) => (
            <button
              key={est.rbd ?? ""}
              type="button"
              onClick={() => handleSelect(est.rbd ?? null)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50",
                selectedRbd === est.rbd ? "bg-ocean/5" : "",
              )}
            >
              <span className={cn(
                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                selectedRbd === est.rbd ? "bg-ocean" : "bg-slate-200",
              )} />
              <div className="min-w-0">
                <p className={cn(
                  "truncate text-sm",
                  selectedRbd === est.rbd ? "font-semibold text-ink" : "text-slate-700",
                )}>
                  {est.nombre_establecimiento}
                </p>
                <p className="text-[11px] text-slate-400">RBD {est.rbd} · {est.comuna}</p>
              </div>
            </button>
          ))}

          {!isLoading && filteredSchools.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No hay escuelas autorizadas que coincidan con tu búsqueda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────
interface PortalShellProps extends PropsWithChildren {
  profile: Profile;
  establishment: Establishment | null;
}

export function PortalShell({ children, profile, establishment }: PortalShellProps): React.ReactElement {
  const pathname = usePathname();
  const { signOut, user, selectedRbd, setSelectedRbd } = usePortalAuth();
  const { data: slepSchools } = useSlepDirectorio();
  const isAdmin = profile.rol === "ADMIN";
  const navigation = isAdmin ? adminNavigation : directorNavigation;

  // For admins activeEstablishment comes from SLEP directorio (SlepEscuela)
  // For directors it comes from the auth context (Establishment)
  const activeSlepSchool = isAdmin
    ? (slepSchools.find((e) => e.rbd === selectedRbd) ?? null)
    : null;
  const activeEstablishment = isAdmin ? null : establishment;
  const activeDisplayName = activeSlepSchool?.nombre_establecimiento ?? activeEstablishment?.nombre ?? "Establecimiento";
  const activeRbd = activeSlepSchool?.rbd ?? activeEstablishment?.rbd ?? profile.rbd;
  const activeComuna = activeSlepSchool?.comuna ?? activeEstablishment?.comuna ?? "";

  const displayName = profile.nombre_director ?? user?.email ?? profile.correo_electronico ?? "";
  const displayEmail = user?.email ?? profile.correo_electronico ?? "";
  const initial = displayEmail.charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:px-6">
      {/* ── Sidebar ── */}
      <aside className="flex w-full flex-col rounded-[30px] border border-white/70 bg-white/78 shadow-panel backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[300px]">
        {/* Brand */}
        <div className="px-5 pt-5 lg:px-6 lg:pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.36em] text-ocean">Consejos Escolares</p>
          <p className="mt-0.5 text-[11px] text-slate-400">SLEP Colchagua</p>
        </div>

        {/* Identity / school info */}
        <div className="mt-4 px-5 lg:px-6">
          {isAdmin ? (
            <SchoolSelector
              selectedRbd={selectedRbd}
              onSelect={setSelectedRbd}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ocean/10 text-ocean">
                <School2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {activeDisplayName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {activeRbd ? `RBD ${activeRbd}` : "Sin RBD"} · {activeComuna}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="mt-5 space-y-0.5 px-3 lg:px-4">
          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-ink text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-ink",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User footer */}
        <div className="border-t border-slate-100 px-5 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ocean text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              {displayName !== displayEmail && (
                <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
              )}
              <p className="truncate text-xs text-slate-400">{displayEmail}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Cerrar sesión"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 rounded-[32px] border border-white/70 bg-white/75 p-5 shadow-panel backdrop-blur lg:p-8">
        {children}
      </main>
    </div>
  );
}
