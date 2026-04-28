"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type UIMessage,
  type ChatStatus,
  type FileUIPart,
  isToolUIPart,
  getToolName,
} from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { MessageCopyButton } from "@/components/ai-elements/message-copy";
import { MessageEditButton } from "@/components/ai-elements/message-edit-button";
import { MessageInlineEditor } from "@/components/ai-elements/message-inline-editor";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  SourceList,
} from "@/components/ai-elements/sources";
import { ToolStatus } from "@/components/ai-elements/tool-status";
import { ChatComposer } from "@/app/components/chat-composer";
import { MessageRenderer } from "@/app/components/message-renderer";
import { extractMessageText, extractCitationUrls } from "@/lib/message-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

function useMessageVisibility(messages: UIMessage[]) {
  const [overrideForId, setOverrideForId] = useState<string | null>(null);

  const lastUserMessageId = useMemo(() => {
    const lastUserMsg = messages.findLast((m) => m.role === "user");
    return lastUserMsg?.id ?? null;
  }, [messages]);

  const showPreviousMessages = overrideForId === lastUserMessageId;

  const visibleMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    if (showPreviousMessages) return messages;
    const lastUserMessageIndex = messages.findLastIndex(
      (m) => m.role === "user",
    );
    if (lastUserMessageIndex === -1) return messages;
    return messages.slice(lastUserMessageIndex);
  }, [messages, showPreviousMessages]);

  const hasPreviousMessages = messages.length > visibleMessages.length;

  const togglePreviousMessages = useCallback(() => {
    if (showPreviousMessages) {
      setOverrideForId(null);
    } else {
      setOverrideForId(lastUserMessageId);
    }
  }, [showPreviousMessages, lastUserMessageId]);

  return {
    visibleMessages,
    hasPreviousMessages,
    showPreviousMessages,
    togglePreviousMessages,
  };
}

const TOOL_LABELS: Record<string, string> = {
  search: "Searching",
  read: "Reading source",
  depth: "Extracting from source",
};

interface ChatViewProps {
  messages: UIMessage[];
  status: ChatStatus;
  sendMessage: (
    message:
      | { text: string; files?: FileUIPart[]; messageId?: string }
      | { files: FileUIPart[]; messageId?: string },
  ) => void;
  stop: () => void;
  error?: Error;
}

export function ChatView({
  messages,
  status,
  sendMessage,
  stop,
  error,
}: ChatViewProps) {
  const isStreaming = status === "submitted" || status === "streaming";

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const {
    visibleMessages,
    hasPreviousMessages,
    showPreviousMessages,
    togglePreviousMessages,
  } = useMessageVisibility(messages);

  let activeToolStatus: { toolName: string; action: string } | null = null;
  if (isStreaming) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      for (const part of lastMessage.parts) {
        if (
          isToolUIPart(part) &&
          part.state !== "output-available" &&
          part.state !== "output-error"
        ) {
          const name = getToolName(part);
          activeToolStatus = {
            toolName: name,
            action: TOOL_LABELS[name] ?? `Running ${name}`,
          };
          break;
        }
      }
    }
  }

  const lastVisibleAssistantId = useMemo(() => {
    return visibleMessages.findLast((m) => m.role === "assistant")?.id ?? null;
  }, [visibleMessages]);

  const uniqueSources = useMemo(() => {
    const lastAssistant = messages.findLast((m) => m.role === "assistant");
    if (!lastAssistant) return [];
    const text = extractMessageText(lastAssistant);
    return extractCitationUrls(text);
  }, [messages]);

  const [dismissedErrorMsg, setDismissedErrorMsg] = useState<string | null>(
    null,
  );
  const showError = error && error.message !== dismissedErrorMsg;

  const emptyState = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {emptyState ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p className="text-base text-muted-foreground">
            Ask anything about a health topic, perspective, or report.
          </p>
        </div>
      ) : (
        <Conversation className="w-full flex-1 min-h-0">
          <ConversationContent
            className={cn(
              "mx-auto max-w-[var(--container-max-w)] px-4 md:px-8",
              "pb-[calc(var(--composer-offset)+env(safe-area-inset-bottom))]",
            )}
          >
            <>
              {hasPreviousMessages && (
                <div className="w-full flex justify-center py-2">
                  <Button
                    onClick={togglePreviousMessages}
                    size="sm"
                    variant="outline"
                    type="button"
                    className="h-7 gap-1"
                  >
                    {showPreviousMessages ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Hide previous
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> Show previous
                      </>
                    )}
                  </Button>
                </div>
              )}

              {visibleMessages.map((message) => {
                const isLastAssistant =
                  message.role === "assistant" &&
                  message.id === lastVisibleAssistantId;
                const isLastMessage =
                  message.id === messages[messages.length - 1]?.id;

                const isEditing = editingMessageId === message.id;
                const hasFileParts = message.parts.some(
                  (p) => p.type === "file",
                );

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent
                      actions={
                        message.role === "assistant" ? (
                          <MessageCopyButton message={message} />
                        ) : message.role === "user" &&
                            !isStreaming &&
                            !isEditing &&
                            !hasFileParts ? (
                          <MessageEditButton
                            onClick={() => setEditingMessageId(message.id)}
                          />
                        ) : undefined
                      }
                    >
                      {isEditing ? (
                        <MessageInlineEditor
                          defaultText={extractMessageText(message)}
                          onSave={(newText) => {
                            sendMessage({
                              text: newText,
                              messageId: message.id,
                            });
                            setEditingMessageId(null);
                          }}
                          onCancel={() => setEditingMessageId(null)}
                        />
                      ) : (
                        <MessageRenderer
                          message={message}
                          isStreaming={isStreaming && isLastMessage}
                        />
                      )}
                      {isLastAssistant &&
                      uniqueSources.length > 0 &&
                      !isStreaming ? (
                        <div className="mt-3">
                          <Sources>
                            <SourcesTrigger count={uniqueSources.length} />
                            <SourcesContent>
                              <SourceList items={uniqueSources} />
                            </SourcesContent>
                          </Sources>
                        </div>
                      ) : null}
                    </MessageContent>
                  </Message>
                );
              })}

              {isStreaming && activeToolStatus ? (
                <ToolStatus
                  toolName={activeToolStatus.toolName}
                  action={activeToolStatus.action}
                />
              ) : null}
            </>
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {showError && (
        <div className="mx-auto w-full max-w-[var(--container-max-w)] px-4 pb-2">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissedErrorMsg(error.message)}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <ChatComposer onSubmit={sendMessage} status={status} onStop={stop} />
    </div>
  );
}
