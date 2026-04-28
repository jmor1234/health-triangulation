"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ChatStatus, FileUIPart } from "ai";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputToolbar,
} from "@/components/ai-elements/prompt-input";

interface ChatComposerProps {
  onSubmit: (
    message: { text: string; files?: FileUIPart[] } | { files: FileUIPart[] },
  ) => void;
  status: ChatStatus;
  onStop: () => void;
  disabled?: boolean;
}

export function ChatComposer({
  onSubmit,
  status,
  onStop,
  disabled,
}: ChatComposerProps) {
  const handleSubmit = useCallback(
    (
      { text, files }: { text?: string; files?: FileUIPart[] },
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      if (status === "streaming") {
        event.preventDefault();
        return;
      }
      const trimmed = text?.trim();
      if (trimmed) {
        onSubmit({ text: trimmed, files });
      } else if (files && files.length > 0) {
        onSubmit({ files });
      }
    },
    [onSubmit, status],
  );

  const handleStopClick = useCallback(
    (e: React.MouseEvent) => {
      if (status === "streaming") {
        e.preventDefault();
        onStop();
      }
    },
    [status, onStop],
  );

  return (
    <div
      className={cn(
        "fixed left-0 right-0 bottom-0 z-30 w-screen px-3",
        "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        "md:sticky md:bottom-0 md:left-auto md:right-auto md:z-30",
        "md:w-full md:mx-auto md:px-3 md:py-3",
        "md:max-w-[var(--container-max-w)]",
      )}
    >
      <PromptInput
        className={cn(
          "border bg-background/95 rounded-xl border-border shadow-sm transition-shadow",
          "focus-within:ring-2 focus-within:ring-accent-brand/30 focus-within:border-accent-brand/40",
        )}
        multiple
        accept="image/*,application/pdf,text/*"
        onSubmit={handleSubmit}
      >
        <PromptInputAttachments>
          {(attachment) => (
            <PromptInputAttachment key={attachment.id} data={attachment} />
          )}
        </PromptInputAttachments>

        <div className="px-4 pt-2">
          <PromptInputTextarea
            className="min-h-0 max-h-[40svh] resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 md:text-base"
            placeholder="Ask anything…"
            rows={1}
            data-status={status}
            disabled={disabled}
          />
        </div>

        <PromptInputToolbar className="px-2 pb-2 pt-1 justify-end">
          <PromptInputSubmit
            className={cn(
              "h-9 px-4 rounded-lg",
              "bg-accent-brand text-accent-brand-foreground hover:bg-accent-brand/90",
              "disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
            )}
            variant="default"
            size="default"
            status={status}
            onClick={handleStopClick}
            disabled={disabled}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
