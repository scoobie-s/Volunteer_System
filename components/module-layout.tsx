import type { ReactNode } from "react";
import { Card, Eyebrow } from "@/components/ui";

export function ModulePageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <Card className="mb-6 overflow-visible border-0 bg-transparent p-0 shadow-none md:overflow-hidden md:border md:border-[var(--line)] md:bg-white md:shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="bg-transparent px-0 py-0 md:bg-white md:px-6 md:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.05em] text-slate-900 md:text-[28px]">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export function ModuleSplitLayout({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">{primary}{secondary}</div>;
}

export function ModuleStack({
  children,
  className = "space-y-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
