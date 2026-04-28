"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";

export interface SourceListItemData {
  url: string;
  title?: string;
  domain?: string;
}

export const Sources = ({ className, ...props }: ComponentProps<"div">) => (
  <Collapsible
    className={cn("not-prose mb-4 text-xs", className)}
    {...props}
  />
);

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: ComponentProps<typeof CollapsibleTrigger> & { count: number }) => (
  <CollapsibleTrigger
    className={cn(
      "group inline-flex items-center gap-2 rounded-md border px-2 py-1",
      "cursor-pointer select-none transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/40",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      "data-[state=open]:bg-muted/60",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium tabular-nums">Sources · {count}</p>
        <ChevronDownIcon className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export const SourcesContent = ({
  className,
  ...props
}: ComponentProps<typeof CollapsibleContent>) => (
  <CollapsibleContent
    className={cn(
      "mt-2 w-full max-w-[720px] rounded-lg border bg-muted/20 p-2 shadow-sm",
      "flex flex-col gap-2",
      "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in",
      "motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-top-2",
      "motion-safe:data-[state=open]:slide-in-from-top-2 outline-none",
      className,
    )}
    {...props}
  />
);

export const SourceListItem = ({
  url,
  title,
  domain,
  className,
}: SourceListItemData & { className?: string }) => {
  let parsedDomain = domain;
  if (!parsedDomain) {
    try {
      parsedDomain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* */
    }
  }
  const label =
    title && title.trim().length > 0 ? title.trim() : parsedDomain || url;
  const favicon = parsedDomain
    ? `https://www.google.com/s2/favicons?domain=${parsedDomain}&sz=32`
    : undefined;

  return (
    <li className={cn("list-none", className)}>
      <a
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        className={cn(
          "group flex items-center gap-2 min-h-6 -mx-1.5 px-1.5 rounded-md",
          "cursor-pointer transition-colors hover:bg-muted/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
        aria-label={
          title
            ? `${title}${parsedDomain ? ` — ${parsedDomain}` : ""}`
            : parsedDomain || url
        }
        title={title ? `${title} — ${url}` : url}
      >
        {favicon ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={favicon}
            alt=""
            aria-hidden="true"
            width={14}
            height={14}
            className="h-[14px] w-[14px] rounded-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <BookIcon
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span className="truncate">{label}</span>
        {parsedDomain && (
          <span className="ml-1 hidden truncate text-muted-foreground/70 sm:inline">
            ({parsedDomain})
          </span>
        )}
      </a>
    </li>
  );
};

export const SourceList = ({
  items,
  initialCount = 8,
  className,
  ...props
}: ComponentProps<"div"> & {
  items: SourceListItemData[];
  initialCount?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);

  return (
    <div className={cn("w-full", className)} {...props}>
      <ul className="space-y-1">
        {visible.map((s, i) => (
          <SourceListItem
            key={`${s.url}-${i}`}
            url={s.url}
            title={s.title}
            domain={s.domain}
          />
        ))}
      </ul>
      {items.length > initialCount && !expanded && (
        <button
          type="button"
          className="mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm"
          onClick={() => setExpanded(true)}
        >
          Show all
        </button>
      )}
    </div>
  );
};
