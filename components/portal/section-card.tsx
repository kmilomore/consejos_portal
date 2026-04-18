import type { PropsWithChildren } from "react";

interface SectionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionCard({ eyebrow, title, description, children }: PropsWithChildren<SectionCardProps>) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/70">
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ocean">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}