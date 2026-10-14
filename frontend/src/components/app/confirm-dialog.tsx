"use client";

import { useEffect } from "react";

import { AppButton } from "@/components/app/button";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        className="w-full max-w-sm animate-pop-in rounded-3xl bg-card p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="confirm-message" className="text-center font-display text-lg font-black">
          {message}
        </p>
        <div className="mt-4 flex gap-3">
          <AppButton className="flex-1" onClick={onCancel} autoFocus>
            {cancelLabel}
          </AppButton>
          <AppButton variant="warning" className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
