"use client";

import Link from "next/link";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-page";

export function LegalPage({
  eyebrow,
  title,
  lede,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-100 font-sans text-navy-500">
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-50 bg-royal-500 px-4 py-2 font-bold text-white focus:top-0"
      >
        Saltar al contenido
      </a>
      <LandingHeader />
      <main id="main-content">
        <div className="bg-grad-navy pb-20 pt-12 text-white">
          <div className="mx-auto max-w-[880px] px-5 md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/85">{eyebrow}</p>
          </div>
        </div>
        <article className="relative z-[2] mx-auto -mt-14 mb-16 max-w-[880px] rounded-[18px] bg-white px-6 py-10 shadow-md md:px-14 md:py-14">
          <nav className="mb-4 text-xs font-medium text-neutral-500" aria-label="Miga de pan">
            <Link href="/" className="font-bold text-royal-500 hover:underline">
              Inicio
            </Link>{" "}
            / {title}
          </nav>
          <h1 className="font-display text-3xl font-black leading-[1.08] tracking-[-0.025em] text-navy-500 md:text-[40px]">
            {title}
          </h1>
          <p className="mt-3.5 text-justify text-[17px] font-medium leading-normal text-neutral-700">{lede}</p>
          <p className="mt-4 border-b border-neutral-200 pb-6 text-[13px] font-medium text-neutral-500">
            Última actualización: {updatedAt}
          </p>
          <div className="legal-article mt-6 text-justify">{children}</div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
