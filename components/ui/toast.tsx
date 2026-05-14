"use client";

import { useState, useCallback, useEffect } from "react";
import { Alert } from "@/components/ui/alert";

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

// Module-level ref so toast() can be called from anywhere without hooks
let _addToast: ((message: string, tone: ToastTone) => void) | null = null;

export function toast(message: string, tone: ToastTone = "success") {
  _addToast?.(message, tone);
}

const tones = {
  success: "success",
  error: "danger",
  info: "info",
} as const;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, tone: ToastTone) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => {
      _addToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 print:hidden">
      {toasts.map((t) => {
        return (
          <Alert
            key={t.id}
            tone={tones[t.tone]}
            variant="tinted"
            size="sm"
            floating
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="w-[min(28rem,calc(100vw-3rem))]"
          >
            <p>{t.message}</p>
          </Alert>
        );
      })}
    </div>
  );
}
