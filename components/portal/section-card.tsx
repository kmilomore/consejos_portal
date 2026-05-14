import type { PropsWithChildren } from "react";

interface SectionCardProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionCard({ eyebrow, title, description, children }: PropsWithChildren<SectionCardProps>) {
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