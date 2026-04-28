"use client";

import { cn } from "@/lib/utils";

export type ToolStatusProps = {
  toolName?: string;
  action: string;
  className?: string;
};

export const ToolStatus = ({ action, className }: ToolStatusProps) => (
  <div
    className={cn(
      "mx-auto w-full max-w-[var(--container-max-w)] px-4 md:px-6 my-3",
      className,
    )}
    aria-live="polite"
  >
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
        "bg-accent-brand-muted text-accent-brand",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2",
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping bg-accent-brand" />
        <span className="relative inline-flex size-2 rounded-full bg-accent-brand" />
      </span>
      <span className="font-medium">{action}</span>
    </div>
  </div>
);
