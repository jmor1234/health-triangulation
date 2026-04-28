"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
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
      "group inline-flex items-center gap-2 rounded-md border border-border/70 px-2.5 py-1",
      "cursor-pointer select-none transition-colors",
      "text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      "data-[state=open]:bg-muted/60 data-[state=open]:text-foreground data-[state=open]:border-border",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <span className="font-medium tracking-tight">Sources</span>
        <span className="text-muted-foreground/70 tabular-nums">{count}</span>
        <ChevronDownIcon
          className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
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
      "mt-2 w-full max-w-[720px] rounded-lg border border-border/70 bg-muted/20 p-1.5",
      "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:animate-in",
      "motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:slide-out-to-top-2",
      "motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-top-2 outline-none",
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
  const showDomain =
    parsedDomain &&
    title &&
    title.trim().length > 0 &&
    title.trim() !== parsedDomain;

  return (
    <li className={cn("list-none", className)}>
      <a
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        className={cn(
          "group flex items-center gap-2.5 min-h-7 px-2 py-1 rounded-md",
          "cursor-pointer transition-colors",
          "hover:bg-muted/60",
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
            className="size-[14px] shrink-0 rounded-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <BookIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span className="truncate text-foreground/90 group-hover:text-foreground">
          {label}
        </span>
        {showDomain && (
          <span className="ml-auto shrink-0 truncate pl-2 text-[11px] text-muted-foreground/70 group-hover:text-muted-foreground">
            {parsedDomain}
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
  const hasMore = items.length > initialCount;
  const remaining = items.length - initialCount;

  return (
    <div className={cn("w-full", className)} {...props}>
      <ul>
        {visible.map((s, i) => (
          <SourceListItem
            key={`${s.url}-${i}`}
            url={s.url}
            title={s.title}
            domain={s.domain}
          />
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          aria-expanded={expanded}
          className={cn(
            "mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]",
            "text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="size-3" aria-hidden="true" />
              Show fewer
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-3" aria-hidden="true" />
              Show {remaining} more
            </>
          )}
        </button>
      )}
    </div>
  );
};
