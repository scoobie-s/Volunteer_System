import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function Button({
  className,
  asChild,
  ...props
}: ComponentPropsWithoutRef<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none transition focus:border-slate-300 focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}

export function Label(props: ComponentPropsWithoutRef<"label">) {
  return <label className="mb-2 block text-sm font-medium text-slate-700" {...props} />;
}

export function Eyebrow({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  className,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  isLoading = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[26px] border border-white/60 bg-[#f8fafc] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <h5 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h5>
        <div className="mt-3 text-sm text-slate-600">{message}</div>
        <div className="mt-5 flex justify-end gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
