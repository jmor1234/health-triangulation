"use client";

import type { UIMessage } from "ai";
import { usePersistedChat } from "@/hooks/use-persisted-chat";
import { ChatView } from "@/components/chat-view";

export function ChatPage({ threadId }: { threadId: string }) {
  const { messages, sendMessage, status, stop, error } = usePersistedChat({
    threadId,
  });

  return (
    <ChatView
      messages={messages as UIMessage[]}
      sendMessage={sendMessage}
      status={status}
      stop={stop}
      error={error}
    />
  );
}
