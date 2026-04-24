import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const styles: Record<ButtonVariant, string> = {
  primary: "bg-ocean text-white shadow-[0_16px_30px_rgba(15,105,180,0.28)] hover:-translate-y-0.5 hover:bg-[#0c5a9a] hover:shadow-[0_20px_36px_rgba(15,105,180,0.34)]",
  secondary: "bg-white text-ink ring-1 ring-slate-200 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md",
  ghost: "bg-transparent text-slate-700 hover:bg-white/70 hover:text-ink",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ocean/25",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}