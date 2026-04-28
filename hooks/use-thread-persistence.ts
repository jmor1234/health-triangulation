"use client";

import { useEffect, useRef, useCallback } from "react";
import type { UIMessage } from "ai";
import { loadMessages, saveMessages } from "@/lib/thread-store";

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export function useThreadPersistence({
  threadId,
  messages,
  setMessages,
  status,
}: {
  threadId: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  status: ChatStatus;
}) {
  const prevStatusRef = useRef<ChatStatus>(status);

  useEffect(() => {
    let cancelled = false;
    loadMessages(threadId).then((stored) => {
      if (cancelled) return;
      if (stored.length > 0) {
        setMessages(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, setMessages]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    const wasActive = prev === "streaming" || prev === "submitted";
    if (wasActive && status === "ready" && messages.length > 0) {
      saveMessages(threadId, messages);
    }
  }, [status, threadId, messages]);

  const forceSave = useCallback(() => {
    if (messages.length > 0) {
      saveMessages(threadId, messages);
    }
  }, [threadId, messages]);

  return { forceSave };
}
