import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "warning" | "success" | "danger";
type AlertVariant = "outlined" | "tinted";
type AlertSize = "sm" | "md";

interface AlertProps {
  title?: ReactNode;
  children: ReactNode;
  tone?: AlertTone;
  variant?: AlertVariant;
  size?: AlertSize;
  action?: ReactNode;
  onClose?: () => void;
  floating?: boolean;
  className?: string;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertCircle,
} as const;

const outlinedStyles: Record<AlertTone, string> = {
  info: "border-status-info bg-white text-ink",
  warning: "border-status-warning bg-white text-ink",
  success: "border-status-success bg-white text-ink",
  danger: "border-status-danger bg-white text-ink",
};

const tintedStyles: Record<AlertTone, string> = {
  info: "border-status-info bg-status-info-bg text-ink",
  warning: "border-status-warning bg-status-warning-bg text-ink",
  success: "border-status-success bg-status-success-bg text-ink",
  danger: "border-status-danger bg-status-danger-bg text-ink",
};

const iconStyles: Record<AlertTone, string> = {
  info: "text-status-info",
  warning: "text-status-warning",
  success: "text-status-success",
  danger: "text-status-danger",
};

const sizeStyles: Record<AlertSize, string> = {
  sm: "min-h-14 px-3.5 py-2.5 text-sm",
  md: "min-h-[76px] px-4 py-3.5 text-sm",
};

export function Alert({
  title,
  children,
  tone = "info",
  variant = "outlined",
  size = "md",
  action,
  onClose,
  floating = false,
  className,
}: AlertProps) {
  const Icon = icons[tone];

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-sm border-2 font-medium leading-6",
        sizeStyles[size],
        variant === "tinted" ? tintedStyles[tone] : outlinedStyles[tone],
        floating && "shadow-lg",
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      <div className={cn("mt-0.5 shrink-0", iconStyles[tone])}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold leading-5">{title}</p> : null}
        <div className={cn("text-sm text-neutral-700", title && "mt-1")}>{children}</div>
      </div>

      {action ? <div className="self-center">{action}</div> : null}

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded-sm p-1 text-current opacity-60 transition-opacity hover:opacity-100"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}