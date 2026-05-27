"use client";

import { useState, type PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  collapsible?: boolean;
}

export function SectionCard({ eyebrow, title, description, children, collapsible }: PropsWithChildren<SectionCardProps>) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (collapsible) {
    return (
      <section className="rounded-modal border border-neutral-200 bg-white shadow-md ring-1 ring-white/70">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "w-full px-6 pt-6 pb-5 text-left xl:px-7 xl:pt-7 xl:pb-5",
            expanded && "border-b border-neutral-200",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">{eyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
              {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-600">{description}</p> : null}
            </div>
            <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
              {expanded ? "Colapsar" : "Expandir"}
            </span>
          </div>
        </button>
        {expanded && <div className="px-6 pt-5 pb-6 xl:px-7 xl:pt-5 xl:pb-7">{children}</div>}
      </section>
    );
  }

  return (
    <section className="rounded-modal border border-neutral-200 bg-white p-6 shadow-md ring-1 ring-white/70 xl:p-7">
      <div className="mb-5 space-y-2 border-b border-neutral-200 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">{eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-neutral-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
