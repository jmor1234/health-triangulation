"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { extractMessageText } from "@/lib/message-utils";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

export function MessageCopyButton({
  message,
  className,
}: {
  message: UIMessage;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = extractMessageText(message);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 gap-1.5 cursor-pointer transition-colors", className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy message"}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
      <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
