"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon } from "lucide-react";

export function MessageInlineEditor({
  defaultText,
  onSave,
  onCancel,
}: {
  defaultText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(defaultText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== defaultText) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }, [text, defaultText, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSave, onCancel],
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <textarea
        ref={textareaRef}
        name="edit-message"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2 text-base leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        rows={1}
      />
      <div className="flex items-center gap-1 justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 cursor-pointer"
          onClick={onCancel}
          aria-label="Cancel editing"
        >
          <XIcon className="h-3.5 w-3.5" />
          <span className="text-xs">Cancel</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 cursor-pointer"
          onClick={handleSave}
          aria-label="Save edit"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          <span className="text-xs">Save</span>
        </Button>
      </div>
    </div>
  );
}
