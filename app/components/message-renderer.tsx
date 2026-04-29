"use client";

import { type UIMessage, isToolUIPart, getToolName } from "ai";
import NextImage from "next/image";
import { Response } from "@/components/ai-elements/response";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { ToolCall } from "@/components/ai-elements/tool-call";

interface MessageRendererProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function MessageRenderer({ message, isStreaming }: MessageRendererProps) {
  return (
    <>
      {message.parts.map((part, idx) => {
        if (message.role === "assistant" && isToolUIPart(part)) {
          return (
            <ToolCall
              key={idx}
              toolName={getToolName(part)}
              state={part.state}
              input={"input" in part ? part.input : undefined}
              output={"output" in part ? part.output : undefined}
              errorText={"errorText" in part ? part.errorText : undefined}
            />
          );
        }

        switch (part.type) {
          case "text":
            if (!part.text.trim()) return null;
            if (message.role === "user") {
              return (
                <span key={idx} className="whitespace-pre-wrap">
                  {part.text}
                </span>
              );
            }
            return (
              <div key={idx} className="leading-relaxed">
                <Response isStreaming={isStreaming}>{part.text}</Response>
              </div>
            );

          case "reasoning":
            return (
              <Reasoning
                key={idx}
                text={part.text}
                state={
                  "state" in part
                    ? (part.state as "streaming" | "done")
                    : undefined
                }
              />
            );

          case "file":
            if (part.mediaType?.startsWith("image/")) {
              return (
                <div key={idx} className="my-2">
                  <NextImage
                    src={part.url}
                    alt={part.filename || "Image"}
                    width={384}
                    height={200}
                    className="max-w-full sm:max-w-sm rounded-lg border border-border/50 shadow-sm object-contain"
                    unoptimized
                  />
                  {part.filename && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {part.filename}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={idx} className="my-2 text-sm text-muted-foreground">
                {part.filename || "Attachment"}
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
