"use client";

import { cn } from "@/lib/utils";
import { memo } from "react";
import { Streamdown } from "streamdown";

interface ResponseProps {
  children: string;
  className?: string;
  isStreaming?: boolean;
}

export const Response = memo(
  ({ className, children, isStreaming }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*]:my-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      mode={isStreaming ? "streaming" : "static"}
      linkSafety={{ enabled: false }}
    >
      {children}
    </Streamdown>
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isStreaming === nextProps.isStreaming,
);

Response.displayName = "Response";
