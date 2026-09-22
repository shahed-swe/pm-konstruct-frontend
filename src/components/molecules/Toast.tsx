"use client";

/**
 * Transient feedback: "Diary entry saved", "Could not upload that photo".
 *
 * The queue lives in the UI store rather than in a context, so a mutation's
 * `onError` can raise one without being inside a provider -- the legacy's
 * `useToast` could only be called from a component, which is why several
 * error paths silently showed nothing.
 */
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { useEffect, type ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";
import { useUiStore, type Toast as ToastData } from "@/stores/ui.store";

const VARIANT_CLASS: Record<ToastData["variant"], string> = {
  default: "border bg-background text-foreground",
  success: "border-transparent bg-primary text-primary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
};

function ToastItem({ toast }: { toast: ToastData }) {
  const dismiss = useUiStore((s) => s.dismissToast);

  // Radix removes the element on close; the store still holds it, so the
  // queue would grow unboundedly over a long session without this.
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <ToastPrimitives.Root
      duration={6000}
      onOpenChange={(open) => {
        if (!open) dismiss(toast.id);
      }}
      className={cn(
        "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-md p-4 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out",
        VARIANT_CLASS[toast.variant],
      )}
    >
      <div className="grid gap-1">
        <ToastPrimitives.Title className="text-sm font-semibold">{toast.title}</ToastPrimitives.Title>
        {toast.description !== undefined && (
          <ToastPrimitives.Description className="text-sm opacity-90">
            {toast.description}
          </ToastPrimitives.Description>
        )}
      </div>
      <ToastPrimitives.Close className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </ToastPrimitives.Close>
    </ToastPrimitives.Root>
  );
}

export function Toaster(props: ComponentProps<typeof ToastPrimitives.Provider>) {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <ToastPrimitives.Provider swipeDirection="right" {...props}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
      <ToastPrimitives.Viewport className="fixed bottom-0 right-0 z-100 flex max-h-dvh w-full flex-col-reverse gap-2 p-4 sm:top-0 sm:right-0 sm:flex-col md:max-w-96" />
    </ToastPrimitives.Provider>
  );
}
