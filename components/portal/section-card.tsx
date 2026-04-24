import type { PropsWithChildren } from "react";

interface SectionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionCard({ eyebrow, title, description, children }: PropsWithChildren<SectionCardProps>) {
  return (
    <section className="panel-reveal rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_18px_45px_rgba(148,163,184,0.14)] ring-1 ring-white/70 xl:p-7">
      <div className="mb-5 space-y-2 border-b border-slate-100 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-ocean">{eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}