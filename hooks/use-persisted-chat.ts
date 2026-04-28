"use client";

import { useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useThreadPersistence } from "@/hooks/use-thread-persistence";

export function usePersistedChat({ threadId }: { threadId: string }) {
  // Memoize the transport — a fresh instance per render would re-fire
  // useChat's internal effects and risk torn streams / duplicate messages.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const chat = useChat({
    id: threadId,
    transport,
    experimental_throttle: 50,
  });

  const { forceSave } = useThreadPersistence({
    threadId,
    messages: chat.messages as UIMessage[],
    setMessages: chat.setMessages,
    status: chat.status,
  });

  useEffect(() => {
    return () => {
      chat.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...chat, forceSave };
}
