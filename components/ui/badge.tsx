import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  tone?: "neutral" | "success" | "warn";
  className?: string;
}

const tones = {
  neutral: "bg-neutral-100 text-neutral-700",
  success: "bg-status-success-bg text-status-success",
  warn:    "bg-status-warning-bg text-status-warning",
};

export function Badge({ children, tone = "neutral", className }: PropsWithChildren<BadgeProps>) {
  return (
    <span className={cn("inline-flex rounded-pill px-3 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
