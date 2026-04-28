"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export const Conversation = ({
  className,
  ...props
}: ComponentProps<typeof StickToBottom>) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-auto overscroll-contain", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export const ConversationContent = ({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) => (
  <StickToBottom.Content className={cn("p-4", className)} {...props} />
);

export const ConversationEmptyState = ({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children?: ReactNode }) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const ConversationScrollButton = ({
  className,
  ...props
}: ComponentProps<typeof Button>) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      aria-label="Scroll to bottom"
      className={cn(
        "absolute bottom-3 left-[50%] -translate-x-1/2 rounded-full",
        "size-8 bg-background/95 backdrop-blur-sm shadow-sm border-border/70",
        "hover:bg-background hover:border-border",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95",
        className,
      )}
      onClick={handleScrollToBottom}
      size="icon-sm"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-3.5" aria-hidden="true" />
    </Button>
  );
};
