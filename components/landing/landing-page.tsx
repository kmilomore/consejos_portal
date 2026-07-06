"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Gavel,
  GraduationCap,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  LogIn,
  Megaphone,
  Menu,
  MessagesSquare,
  PlayCircle,
  Scale,
  School,
  UserCog,
  Users,
  UsersRound,
  X,
  ShieldCheck,
} from "lucide-react";

// ── Contenido ───────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/#que-es", label: "¿Qué es?" },
  { href: "/#integrantes", label: "Integrantes" },
  { href: "/#funciones", label: "Funciones" },
  { href: "/#normativa", label: "Normativa" },
  { href: "/#recursos", label: "Recursos" },
  { href: "/#videos", label: "Videos" },
];

const LEGAL_LINKS = [
  { href: "/terminos/", label: "Términos y condiciones" },
  { href: "/privacidad/", label: "Política de privacidad" },
  { href: "/cookies/", label: "Política de cookies" },
];

const LANDING_CONSENT_STORAGE_KEY = "consejos.landing.legal-consent.v1";

const HERO_STATS = [
  { value: "4", label: "Sesiones mínimas al año exigidas por la normativa" },
  { value: "6", label: "Estamentos de la comunidad educativa representados" },
  { value: "100%", label: "De los establecimientos con aportes del Estado deben tenerlo" },
  { value: "2005", label: "Año en que se reglamentó su funcionamiento" },
];

const CARACTER = [
  {
    icon: Megaphone,
    title: "Informativo",
    chip: "chip-info" as const,
    description:
      "El consejo conoce los resultados de aprendizaje, los informes de fiscalización, el presupuesto y la gestión general del establecimiento.",
  },
  {
    icon: MessagesSquare,
    title: "Consultivo",
    chip: "chip-navy" as const,
    description:
      "Es consultado sobre el Proyecto Educativo Institucional, el plan de mejoramiento, la programación anual y el reglamento interno.",
  },
  {
    icon: Lightbulb,
    title: "Propositivo",
    chip: "chip-success" as const,
    description:
      "Puede proponer iniciativas, actividades y mejoras que beneficien la convivencia y los aprendizajes de la comunidad escolar.",
  },
  {
    icon: Gavel,
    title: "Resolutivo",
    chip: "chip-coral" as const,
    description:
      "Solo si el sostenedor le otorga expresamente esa facultad, el consejo puede adoptar decisiones vinculantes sobre las materias que defina.",
  },
];

const INTEGRANTES = [
  {
    icon: UserCog,
    title: "Director/a del establecimiento",
    description: "Preside el consejo, lo convoca y da cuenta de la gestión educativa ante la comunidad.",
  },
  {
    icon: Landmark,
    title: "Representante del sostenedor",
    description: "En la educación pública, designado por el Servicio Local de Educación Pública.",
  },
  {
    icon: GraduationCap,
    title: "Docente",
    description: "Un profesor o profesora elegido por sus pares para representar al cuerpo docente.",
  },
  {
    icon: HeartHandshake,
    title: "Asistente de la educación",
    description: "Un representante elegido por sus pares, incorporado tras la Ley de Inclusión.",
  },
  {
    icon: Users,
    title: "Representante estudiantil",
    description: "Presidente/a del Centro de Estudiantes o quien designe la organización estudiantil.",
  },
  {
    icon: UsersRound,
    title: "Madres, padres y apoderados",
    description: "Presidente/a del Centro de Padres y Apoderados del establecimiento.",
  },
];

const MATERIAS_INFORMADAS = [
  "Logros de aprendizaje de las y los estudiantes (Simce y otros indicadores).",
  "Informes de las visitas de fiscalización de la Superintendencia de Educación.",
  "Resultados de los concursos para cargos docentes y directivos.",
  "Presupuesto anual e informe de ingresos y gastos del establecimiento.",
  "Enfoque y metas de gestión del equipo directivo.",
];

const MATERIAS_CONSULTADAS = [
  "Proyecto Educativo Institucional (PEI) y sus modificaciones.",
  "Plan de Mejoramiento Educativo (PME) y sus metas.",
  "Programación anual y actividades extracurriculares.",
  "Informe de gestión educativa anual antes de la cuenta pública.",
  "Elaboración y modificación del Reglamento Interno.",
];

const NORMATIVA = [
  {
    icon: Scale,
    title: "Ley N° 19.979 (2004)",
    description: "Crea los Consejos Escolares en todos los establecimientos subvencionados del país.",
    href: "https://www.bcn.cl/leychile/navegar?idNorma=232146",
  },
  {
    icon: FileText,
    title: "Decreto N° 24 (2005), Mineduc",
    description: "Reglamenta la constitución y el funcionamiento de los Consejos Escolares. Modificado en 2016 tras la Ley de Inclusión.",
    href: "https://www.bcn.cl/leychile/navegar?idNorma=235379",
  },
  {
    icon: Scale,
    title: "Ley N° 20.845 de Inclusión Escolar (2015)",
    description: "Fortalece la participación de la comunidad e incorpora a los asistentes de la educación al consejo.",
    href: "https://www.bcn.cl/leychile/navegar?idNorma=1078172",
  },
  {
    icon: Scale,
    title: "Ley N° 20.370 — Ley General de Educación",
    description: "Marco general del sistema educativo y de los derechos y deberes de la comunidad educativa.",
    href: "https://www.bcn.cl/leychile/navegar?idNorma=1006043",
  },
  {
    icon: Scale,
    title: "Ley N° 21.040 — Nueva Educación Pública",
    description: "Crea los Servicios Locales de Educación Pública y refuerza la participación local.",
    href: "https://www.bcn.cl/leychile/navegar?idNorma=1111237",
  },
];

const ORIENTACIONES = [
  {
    icon: ClipboardList,
    title: "Constitución del consejo",
    description:
      "El consejo debe constituirse dentro de los tres primeros meses del año escolar. El director convoca, se levanta un acta de constitución y se informa a toda la comunidad educativa.",
  },
  {
    icon: CalendarClock,
    title: "Sesiones y calendario",
    description:
      "Debe sesionar al menos cuatro veces al año, en meses distintos. Es recomendable acordar el calendario anual en la primera sesión y difundirlo oportunamente.",
  },
  {
    icon: BookOpen,
    title: "Actas y acuerdos",
    description:
      "Cada sesión queda registrada en un acta con los temas tratados, los acuerdos adoptados y sus responsables. Las actas dan trazabilidad al trabajo del consejo.",
  },
];

const SITIOS_OFICIALES = [
  {
    title: "Ministerio de Educación",
    description: "Orientaciones y política educativa nacional",
    href: "https://www.mineduc.cl/",
  },
  {
    title: "Superintendencia de Educación",
    description: "Fiscalización, denuncias y normativa aplicada",
    href: "https://www.supereduc.cl/",
  },
  {
    title: "Agencia de Calidad de la Educación",
    description: "Resultados de aprendizaje e indicadores de desarrollo",
    href: "https://www.agenciaeducacion.cl/",
  },
  {
    title: "Biblioteca del Congreso Nacional — Ley Chile",
    description: "Textos oficiales y actualizados de leyes y decretos",
    href: "https://www.bcn.cl/leychile/",
  },
];

const VIDEOS = [
  {
    title: "¿Qué es el Consejo Escolar?",
    caption: "Introducción al rol y sentido del consejo",
    href: "https://www.youtube.com/results?search_query=qu%C3%A9+es+el+consejo+escolar+mineduc",
  },
  {
    title: "Participación de la comunidad educativa",
    caption: "La Ley de Inclusión y los espacios de participación",
    href: "https://www.youtube.com/results?search_query=participaci%C3%B3n+comunidad+educativa+consejo+escolar",
  },
  {
    title: "Cómo realizar una sesión efectiva",
    caption: "Buenas prácticas para convocar, sesionar y acordar",
    href: "https://www.youtube.com/results?search_query=consejo+escolar+sesi%C3%B3n+buenas+pr%C3%A1cticas",
  },
];

const PORTAL_FEATURES = [
  {
    icon: CalendarClock,
    title: "Programación anual",
    description: "Calendario de sesiones planificado y visible para todo el equipo del establecimiento.",
  },
  {
    icon: ClipboardList,
    title: "Actas digitales",
    description: "Registro de cada sesión con asistentes, temas, acuerdos y evidencias adjuntas.",
  },
  {
    icon: LineChart,
    title: "Métricas y seguimiento",
    description: "Estado de avance de sesiones y acuerdos por establecimiento y a nivel territorial.",
  },
  {
    icon: School,
    title: "Gestión territorial",
    description: "Vista consolidada de los consejos escolares de los establecimientos del SLEP Colchagua.",
  },
];

const CHIP_STYLES: Record<string, string> = {
  "chip-info": "bg-royal-50 text-royal-700",
  "chip-navy": "bg-navy-500 text-white",
  "chip-success": "bg-status-success-bg text-status-success",
  "chip-coral": "bg-coral-50 text-coral-700",
};

// ── Piezas ──────────────────────────────────────────────────────────────────

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.12em] ${
        onDark ? "text-white/85" : "text-royal-500"
      }`}
    >
      {children}
    </p>
  );
}

function PortalAccessButton({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/auth/login/"
      className={`inline-flex items-center gap-2 rounded-control bg-white font-bold text-navy-500 shadow-sm transition hover:bg-neutral-100 ${
        compact ? "px-4 py-2 text-[13px]" : "px-5 py-3 text-sm"
      }`}
    >
      <LogIn className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} aria-hidden="true" />
      Acceder al Portal
    </Link>
  );
}

function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedConsent = window.localStorage.getItem(LANDING_CONSENT_STORAGE_KEY);
    setIsVisible(storedConsent !== "accepted");
    setHasAcceptedTerms(false);
  }, []);

  const acceptConsent = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANDING_CONSENT_STORAGE_KEY, "accepted");
    }

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-700/70 px-5 py-6 backdrop-blur-[2px]">
      <section
        aria-label="Aviso sobre privacidad y cookies"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[640px] rounded-modal border border-royal-100 bg-white shadow-2xl"
      >
        <div className="border-b border-neutral-200 px-6 py-5 md:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-royal-50 text-royal-500">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-royal-500">Privacidad y cookies</p>
              <h2 className="mt-1 text-xl font-black text-navy-500 md:text-2xl">Antes de continuar</h2>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 md:px-8 md:py-6">
          <p className="text-sm font-medium leading-[1.65] text-neutral-700 md:text-[15px]">
            Este sitio informa el tratamiento de datos personales y el uso de almacenamiento técnico necesario para el
            acceso al portal institucional. Para continuar navegando, debes revisar y aceptar nuestra{" "}
            <Link className="font-bold text-royal-600 hover:text-royal-700 hover:underline" href="/privacidad/">
              Política de Privacidad
            </Link>{" "}
            y la{" "}
            <Link className="font-bold text-royal-600 hover:text-royal-700 hover:underline" href="/cookies/">
              Política de Cookies
            </Link>
            .
          </p>
          <p className="mt-3 text-sm font-medium leading-[1.65] text-neutral-600">
            La aceptación permite recordar esta preferencia en tu navegador mediante almacenamiento local técnico
            mínimo.
          </p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-card border border-neutral-200 bg-neutral-50 px-4 py-3">
            <input
              type="checkbox"
              checked={hasAcceptedTerms}
              onChange={(event) => setHasAcceptedTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-royal-600 focus:ring-royal-500"
            />
            <span className="text-sm font-medium leading-[1.55] text-neutral-700">
              He leído y acepto el tratamiento informado sobre privacidad y cookies para continuar.
            </span>
          </label>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium leading-relaxed text-neutral-500">
              Debes marcar la casilla antes de continuar.
            </div>
            <button
              type="button"
              onClick={acceptConsent}
              disabled={!hasAcceptedTerms}
              className="inline-flex min-h-[44px] items-center justify-center rounded-control bg-navy-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-600 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:hover:bg-neutral-300"
            >
              Aceptar y continuar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 shadow-md">
      {/* Utility bar */}
      <div className="hidden items-center justify-between bg-navy-700 px-8 py-2 text-xs text-neutral-100 md:flex">
        <div>Gobierno de Chile · Ministerio de Educación</div>
        <ul className="flex list-none gap-5">
          <li>
            <a className="text-inherit hover:underline hover:underline-offset-2" href="https://www.slepcolchagua.cl/" target="_blank" rel="noreferrer">
              SLEP Colchagua
            </a>
          </li>
          <li>
            <a className="text-inherit hover:underline hover:underline-offset-2" href="https://www.mineduc.cl/" target="_blank" rel="noreferrer">
              Mineduc
            </a>
          </li>
        </ul>
      </div>

      {/* Brand bar */}
      <div className="bg-grad-navy text-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-3.5 md:px-8 md:py-4">
          <Image
            src="/SLEPCOLCHAGUA.webp"
            alt="SLEP Colchagua"
            width={52}
            height={52}
            className="h-[44px] w-[44px] object-contain md:h-[52px] md:w-[52px]"
            priority
          />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-85">
              Servicio Local de Educación Pública · Colchagua
            </div>
            <div className="text-lg font-black tracking-[-0.01em] md:text-[22px]">Consejos Escolares</div>
          </div>
          <div className="ml-auto hidden text-right text-[11px] font-bold uppercase leading-tight tracking-[0.18em] text-white lg:block">
            <div className="text-white/80">Región del Libertador</div>
            <div>Bernardo O&apos;Higgins</div>
          </div>
        </div>
      </div>

      {/* Nav primaria */}
      <nav className="bg-navy-500">
        <div className="mx-auto flex max-w-[1400px] items-center px-5 md:px-8">
          <ul className="hidden list-none lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-block border-b-[3px] border-transparent px-4 py-4 text-sm font-bold text-white transition hover:bg-white/5 hover:border-coral-500"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 py-2 text-sm font-bold text-white lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            Menú
          </button>
          <div className="ml-auto py-2">
            <PortalAccessButton compact />
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <ul className="list-none border-t border-white/10 bg-navy-600 px-5 py-2 lg:hidden">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-white/10 py-3 text-sm font-bold text-white last:border-b-0"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}

// ── Secciones ───────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-grad-hero text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[460px] w-[460px] rounded-full border-[18px] border-coral-500/30"
      />
      <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-14 md:px-8 lg:grid-cols-[1.4fr_1fr] lg:gap-14 lg:py-[72px]">
        <div>
          <Eyebrow onDark>Participación · Comunidad educativa</Eyebrow>
          <h1 className="mt-3.5 max-w-[620px] font-display text-4xl font-black leading-[1.05] tracking-[-0.025em] text-white md:text-[52px]">
            El Consejo Escolar es la voz de toda la comunidad educativa
          </h1>
          <p className="mt-4 max-w-[560px] text-base font-medium leading-[1.55] text-neutral-100/90 md:text-[17px]">
            Es la instancia donde estudiantes, familias, docentes, asistentes de la educación y dirección se informan,
            opinan y proponen sobre la marcha de su escuela o liceo. Conoce qué es, cómo funciona y accede al portal de
            gestión de los consejos escolares del territorio de Colchagua.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <PortalAccessButton />
            <a
              href="#que-es"
              className="inline-flex items-center gap-2 rounded-control border border-white/55 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Conocer qué es
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="rounded-card border border-white/[0.18] bg-white/[0.07] p-5">
              <div className="text-[34px] font-black leading-none tracking-[-0.025em] md:text-[40px]">{stat.value}</div>
              <div className="mt-2 text-xs font-medium leading-snug text-neutral-100/90">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-2 font-display text-3xl font-black leading-[1.1] tracking-[-0.02em] text-navy-500 md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2.5 max-w-[640px] text-[15px] font-medium leading-[1.55] text-neutral-600">{subtitle}</p>
      )}
    </div>
  );
}

function QueEsSection() {
  return (
    <section id="que-es" className="scroll-mt-36 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHead
              eyebrow="¿Qué es?"
              title="Un espacio de participación en cada escuela y liceo"
            />
            <div className="space-y-4 text-base font-medium leading-[1.65] text-neutral-700">
              <p>
                El <strong className="text-navy-500">Consejo Escolar</strong> es el órgano de participación de la
                comunidad educativa. Existe por ley en todos los establecimientos educacionales del país que reciben
                aportes del Estado, y reúne en una misma mesa a la dirección, el sostenedor, las y los docentes, los
                asistentes de la educación, las y los estudiantes y sus familias.
              </p>
              <p>
                Fue creado por la <strong className="text-navy-500">Ley N° 19.979</strong> y su funcionamiento está
                regulado por el <strong className="text-navy-500">Decreto N° 24 de 2005</strong> del Ministerio de
                Educación. La <strong className="text-navy-500">Ley de Inclusión</strong> fortaleció su rol y amplió su
                integración.
              </p>
              <p>
                Debe constituirse dentro de los tres primeros meses del año escolar y sesionar, como mínimo,{" "}
                <strong className="text-navy-500">cuatro veces al año</strong>, dejando registro de sus sesiones y
                acuerdos en actas.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CARACTER.map((item) => (
              <div key={item.title} className="rounded-card border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-royal-50 text-royal-500">
                  <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-lg font-black text-navy-500">{item.title}</h3>
                  <span className={`rounded-pill px-2.5 py-0.5 text-[10px] font-bold tracking-[0.04em] ${CHIP_STYLES[item.chip]}`}>
                    Carácter
                  </span>
                </div>
                <p className="mt-2 text-[13.5px] font-medium leading-normal text-neutral-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrantesSection() {
  return (
    <section id="integrantes" className="scroll-mt-36 bg-neutral-100 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <SectionHead
          eyebrow="Integrantes"
          title="¿Quiénes forman el Consejo Escolar?"
          subtitle="Cada estamento de la comunidad educativa tiene un asiento en el consejo. El establecimiento puede sumar otros integrantes según su realidad."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRANTES.map((member) => (
            <div key={member.title} className="flex items-start gap-4 rounded-card border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-royal-50 text-royal-500">
                <member.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-navy-500">{member.title}</h3>
                <p className="mt-1 text-[13px] font-medium leading-normal text-neutral-600">{member.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FuncionesSection() {
  return (
    <section id="funciones" className="scroll-mt-36 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <SectionHead
          eyebrow="Funciones"
          title="¿De qué se ocupa el consejo?"
          subtitle="La normativa define materias sobre las que el consejo debe ser informado y otras en que debe ser consultado antes de decidir."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-card border border-neutral-200 bg-white p-7 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-royal-500" />
            <div className="flex items-center gap-3">
              <Megaphone className="h-6 w-6 text-royal-500" aria-hidden="true" />
              <h3 className="text-xl font-black text-navy-500">Debe ser informado sobre</h3>
            </div>
            <ul className="mt-5 space-y-3.5">
              {MATERIAS_INFORMADAS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14.5px] font-medium leading-normal text-neutral-700">
                  <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-royal-500" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-card border border-neutral-200 bg-white p-7 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-coral-500" />
            <div className="flex items-center gap-3">
              <MessagesSquare className="h-6 w-6 text-coral-600" aria-hidden="true" />
              <h3 className="text-xl font-black text-navy-500">Debe ser consultado sobre</h3>
            </div>
            <ul className="mt-5 space-y-3.5">
              {MATERIAS_CONSULTADAS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14.5px] font-medium leading-normal text-neutral-700">
                  <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-coral-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function NormativaSection() {
  return (
    <section id="normativa" className="scroll-mt-36 bg-neutral-100 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <SectionHead
          eyebrow="Normativa"
          title="Marco legal de los Consejos Escolares"
          subtitle="Textos oficiales publicados en Ley Chile, de la Biblioteca del Congreso Nacional."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {NORMATIVA.map((norm) => (
            <a
              key={norm.title}
              href={norm.href}
              target="_blank"
              rel="noreferrer"
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-card border border-neutral-200 bg-white p-5 transition hover:-translate-y-px hover:border-royal-300 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-royal-50 text-royal-500">
                <norm.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-navy-500">{norm.title}</h3>
                <p className="mt-0.5 text-[12.5px] font-medium leading-normal text-neutral-600">{norm.description}</p>
              </div>
              <ExternalLink className="h-[18px] w-[18px] text-neutral-400 transition group-hover:text-royal-500" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecursosSection() {
  return (
    <section id="recursos" className="scroll-mt-36 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <SectionHead
          eyebrow="Documentación y orientaciones"
          title="Recursos para el trabajo del consejo"
          subtitle="Orientaciones prácticas para constituir y hacer funcionar el consejo, junto a los sitios oficiales de referencia."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {ORIENTACIONES.map((item) => (
            <div key={item.title} className="rounded-card border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-royal-50 text-royal-500">
                <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-black text-navy-500">{item.title}</h3>
              <p className="mt-2 text-[13.5px] font-medium leading-normal text-neutral-600">{item.description}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-12 text-xl font-black text-navy-500">Sitios oficiales</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SITIOS_OFICIALES.map((site) => (
            <a
              key={site.title}
              href={site.href}
              target="_blank"
              rel="noreferrer"
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-card border border-neutral-200 bg-white px-5 py-4 transition hover:-translate-y-px hover:border-royal-300 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-royal-50 text-royal-500">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-[14.5px] font-black text-navy-500">{site.title}</h4>
                <p className="text-[12.5px] font-medium text-neutral-600">{site.description}</p>
              </div>
              <ExternalLink className="h-[18px] w-[18px] text-neutral-400 transition group-hover:text-royal-500" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideosSection() {
  return (
    <section id="videos" className="scroll-mt-36 bg-neutral-100 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <SectionHead
          eyebrow="Videos"
          title="Material audiovisual"
          subtitle="Selección de material de referencia para conocer y fortalecer el trabajo de los consejos escolares."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {VIDEOS.map((video) => (
            <a
              key={video.title}
              href={video.href}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-card border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-px hover:shadow-md"
            >
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-navy-100 to-royal-200">
                <PlayCircle
                  className="h-14 w-14 text-navy-500/80 transition group-hover:scale-105 group-hover:text-navy-500"
                  aria-hidden="true"
                />
              </div>
              <div className="p-5">
                <h3 className="text-base font-black leading-snug text-navy-500">{video.title}</h3>
                <p className="mt-1.5 text-[13px] font-medium text-neutral-600">{video.caption}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-royal-500 group-hover:text-royal-700">
                  Ver en YouTube
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PortalSection() {
  return (
    <section id="portal" className="scroll-mt-36 md:scroll-mt-48">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-modal bg-grad-deep-blue text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-32 h-[340px] w-[340px] rounded-full border-[14px] border-white/10"
          />
          <div className="relative z-10 grid gap-10 p-8 md:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/85">Portal Consejos Escolares</p>
              <h2 className="mt-3 font-display text-3xl font-black leading-[1.1] tracking-[-0.02em] text-white md:text-4xl">
                La gestión de tu consejo escolar, en un solo lugar
              </h2>
              <p className="mt-4 max-w-[520px] text-[15px] font-medium leading-[1.6] text-neutral-100/90">
                Los equipos directivos y profesionales del SLEP Colchagua gestionan aquí la programación anual, las
                actas y el seguimiento de los consejos escolares de cada establecimiento del territorio.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <PortalAccessButton />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                  Acceso con cuenta institucional
                </span>
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {PORTAL_FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-card border border-white/[0.18] bg-white/[0.07] p-5">
                  <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  <h3 className="mt-3 text-[15px] font-black text-white">{feature.title}</h3>
                  <p className="mt-1 text-[12.5px] font-medium leading-normal text-neutral-100/85">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-navy-700 text-neutral-100">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-12 md:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-14">
        <div className="flex items-start gap-3.5">
          <Image
            src="/SLEPCOLCHAGUA.webp"
            alt="SLEP Colchagua"
            width={56}
            height={56}
            className="h-[56px] w-[56px] shrink-0 object-contain"
          />
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-70">
              Servicio Local de Educación Pública
            </div>
            <div className="text-lg font-black text-white">Colchagua</div>
            <p className="mt-2.5 text-xs font-medium leading-normal text-neutral-100/80">
              Región del Libertador Bernardo O&apos;Higgins
            </p>
          </div>
        </div>

        <div>
          <h5 className="mb-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white">El Consejo Escolar</h5>
          <ul className="list-none space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a className="text-[13.5px] font-medium text-neutral-100/80 hover:text-white hover:underline hover:underline-offset-2" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="mb-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white">Instituciones</h5>
          <ul className="list-none space-y-2">
            {SITIOS_OFICIALES.map((site) => (
              <li key={site.href}>
                <a
                  className="text-[13.5px] font-medium text-neutral-100/80 hover:text-white hover:underline hover:underline-offset-2"
                  href={site.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {site.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="mb-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white">Portal</h5>
          <ul className="list-none space-y-2">
            <li>
              <Link
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-100/80 hover:text-white hover:underline hover:underline-offset-2"
                href="/auth/login/"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Acceder al Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-neutral-100/70 md:px-8">
          <div>© 2026 SLEP Colchagua · Ley 21.040 de Nueva Educación Pública</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} className="text-inherit hover:text-white" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div id="landing-root" className="min-h-screen bg-neutral-100 font-sans text-navy-500">
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-50 bg-royal-500 px-4 py-2 font-bold text-white focus:top-0"
      >
        Saltar al contenido
      </a>
      <LandingHeader />
      <ConsentBanner />
      <main id="main-content">
        <Hero />
        <QueEsSection />
        <IntegrantesSection />
        <FuncionesSection />
        <NormativaSection />
        <RecursosSection />
        <VideosSection />
        <PortalSection />
      </main>
      <LandingFooter />
    </div>
  );
}
