"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export interface ReasoningProps {
  text: string;
  state?: "streaming" | "done";
  className?: string;
}

export const Reasoning = memo(({ text, state, className }: ReasoningProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (state === "streaming") {
      startTimeRef.current = Date.now();
      const timer = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(timer);
    }
    if (state === "done" && startTimeRef.current !== null) {
      const elapsed = Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S);
      startTimeRef.current = null;
      const timer = setTimeout(() => setDuration(elapsed), 0);
      return () => clearTimeout(timer);
    }
  }, [state]);

  useEffect(() => {
    if (state === "done" && isOpen && !hasAutoClosed) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoClosed(true);
      }, AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [state, isOpen, hasAutoClosed]);

  const isStreaming = state === "streaming";
  const label =
    isStreaming || duration === 0
      ? "Thinking…"
      : `Thought for ${duration} second${duration !== 1 ? "s" : ""}`;

  return (
    <Collapsible
      className={cn("not-prose mb-4", className)}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 text-sm",
          "text-muted-foreground transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
        )}
      >
        <BrainIcon
          className="size-3.5 text-muted-foreground/70 group-hover:text-muted-foreground"
          aria-hidden="true"
        />
        <span className="font-medium tracking-tight">{label}</span>
        <span
          className={cn(
            "size-1.5 rounded-full transition-colors",
            isStreaming
              ? "bg-accent-brand animate-pulse"
              : "bg-muted-foreground/30",
          )}
          aria-hidden="true"
        />
        <ChevronDownIcon
          className={cn(
            "ml-auto size-3.5 text-muted-foreground/60 transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "mt-2 outline-none",
          "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in",
          "motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-top-2",
          "motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-top-2",
        )}
      >
        <div className="ml-[7px] border-l border-border/70 pl-4 py-1">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
            {text.replace(/\n{2,}/g, "\n")}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

Reasoning.displayName = "Reasoning";
