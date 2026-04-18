import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  tone?: "neutral" | "success" | "warn";
  className?: string;
}

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-800",
};

export function Badge({ children, tone = "neutral", className }: PropsWithChildren<BadgeProps>) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}