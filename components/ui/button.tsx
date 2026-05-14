import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const styles: Record<ButtonVariant, string> = {
  primary: "bg-ocean text-white shadow-md hover:-translate-y-0.5 hover:bg-royal-600 hover:shadow-lg",
  secondary: "bg-white text-ink ring-1 ring-neutral-200 shadow-sm hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-md",
  ghost: "bg-transparent text-neutral-700 hover:bg-white/70 hover:text-ink",
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
        "inline-flex items-center justify-center rounded-control px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ocean/25",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}