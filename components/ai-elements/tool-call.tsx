"use client";

import { cn, canonicalizeUrlForDedupe } from "@/lib/utils";
import { Loader } from "@/components/ai-elements/loader";
import {
  AlertCircle,
  Check,
  FileText,
  Layers,
  Search,
  Wrench,
} from "lucide-react";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "output-denied"
  | "approval-requested"
  | "approval-responded";

export interface ToolCallProps {
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

const TOOL_LABELS: Record<string, string> = {
  search: "Search",
  read: "Read",
  depth: "Extract",
};

function ToolIcon({
  toolName,
  className,
}: {
  toolName: string;
  className?: string;
}) {
  const props = { className, "aria-hidden": true } as const;
  switch (toolName) {
    case "search":
      return <Search {...props} />;
    case "read":
      return <FileText {...props} />;
    case "depth":
      return <Layers {...props} />;
    default:
      return <Wrench {...props} />;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface ParsedInput {
  primary: string;
  secondary?: string;
}

function parseInput(toolName: string, input: unknown): ParsedInput | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  switch (toolName) {
    case "search":
      if (typeof obj.query === "string" && obj.query.length > 0) {
        return { primary: obj.query };
      }
      return null;
    case "read":
      if (typeof obj.url === "string") {
        return {
          primary: getDomain(obj.url),
          secondary:
            typeof obj.query === "string" && obj.query.length > 0
              ? obj.query
              : undefined,
        };
      }
      return null;
    case "depth":
      if (typeof obj.url === "string") {
        return {
          primary: getDomain(obj.url),
          secondary:
            typeof obj.objective === "string" && obj.objective.length > 0
              ? obj.objective
              : undefined,
        };
      }
      return null;
    default: {
      const firstString = Object.values(obj).find(
        (v) => typeof v === "string" && v.length > 0,
      );
      return firstString ? { primary: firstString as string } : null;
    }
  }
}

function parseOutputPreview(
  toolName: string,
  output: unknown,
): string | null {
  if (output === undefined || output === null) return null;

  switch (toolName) {
    case "search": {
      if (!Array.isArray(output)) return null;
      const seen = new Set<string>();
      const domains: string[] = [];
      for (const r of output) {
        if (!r || typeof r !== "object") continue;
        const url = (r as { url?: unknown }).url;
        if (typeof url !== "string") continue;
        const canonical = canonicalizeUrlForDedupe(url);
        if (seen.has(canonical)) continue;
        seen.add(canonical);
        domains.push(getDomain(url));
        if (domains.length >= 3) break;
      }
      if (domains.length === 0) return null;
      const more = output.length - domains.length;
      return more > 0
        ? `${domains.join(" · ")} · +${more} more`
        : domains.join(" · ");
    }
    case "read": {
      if (!output || typeof output !== "object") return null;
      const obj = output as Record<string, unknown>;
      const highlights = obj.highlights;
      if (!Array.isArray(highlights)) return null;
      const n = highlights.length;
      return `${n} excerpt${n === 1 ? "" : "s"}`;
    }
    case "depth": {
      if (!output || typeof output !== "object") return null;
      const obj = output as Record<string, unknown>;
      const findings = obj.findings;
      if (!Array.isArray(findings)) return null;
      const n = findings.length;
      return `${n} finding${n === 1 ? "" : "s"}`;
    }
    default:
      return null;
  }
}

export function ToolCall({
  toolName,
  state,
  input,
  output,
  errorText,
}: ToolCallProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;
  const parsed = parseInput(toolName, input);
  const isInFlight =
    state === "input-streaming" || state === "input-available";
  const isComplete = state === "output-available";
  const isError = state === "output-error";

  const preview = isComplete ? parseOutputPreview(toolName, output) : null;

  return (
    <div
      className={cn(
        "not-prose my-3 rounded-lg border border-border/70 bg-muted/20",
        "px-3 py-2 text-xs",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
      )}
    >
      <div className="flex items-center gap-2">
        <ToolIcon
          toolName={toolName}
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="font-medium tracking-tight text-foreground/90">
          {label}
        </span>
        <span className="ml-auto flex shrink-0 items-center">
          {isInFlight ? (
            <Loader className="text-muted-foreground/70" size={14} />
          ) : isComplete ? (
            <Check
              className="size-3.5 text-muted-foreground/60 motion-safe:animate-in motion-safe:fade-in-0"
              aria-hidden="true"
            />
          ) : isError ? (
            <AlertCircle
              className="size-3.5 text-destructive motion-safe:animate-in motion-safe:fade-in-0"
              aria-hidden="true"
            />
          ) : null}
        </span>
      </div>
      {parsed && (
        <div className="mt-1 ml-[22px] flex flex-col gap-0.5">
          <span className="line-clamp-2 leading-snug text-muted-foreground">
            {parsed.primary}
          </span>
          {parsed.secondary && (
            <span className="line-clamp-1 text-[11px] text-muted-foreground/70">
              {parsed.secondary}
            </span>
          )}
        </div>
      )}
      {preview && (
        <div className="mt-1.5 ml-[22px] truncate text-[11px] text-muted-foreground/70">
          {preview}
        </div>
      )}
      {isError && errorText && (
        <div className="mt-1 ml-[22px] line-clamp-2 text-[11px] text-destructive/80">
          {errorText}
        </div>
      )}
    </div>
  );
}
