"use client";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center print:hidden">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-modal bg-white p-6 shadow-lg">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className={tone === "danger" ? "!bg-status-danger hover:!bg-coral-700 !text-white !shadow-status-danger/20" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
