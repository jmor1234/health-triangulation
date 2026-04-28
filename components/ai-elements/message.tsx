"use client";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UIMessage } from "ai";
import type { HTMLAttributes, ReactNode } from "react";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full items-end justify-end gap-2",
      from === "user"
        ? "is-user py-4"
        : "is-assistant flex-row-reverse justify-end py-6",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  actions?: ReactNode;
};

export const MessageContent = ({
  children,
  className,
  actions,
  ...props
}: MessageContentProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="relative flex flex-col">
      <div
        className={cn(
          "flex flex-col gap-2 overflow-hidden text-base leading-relaxed",
          "group-[.is-user]:px-4 group-[.is-user]:py-2 group-[.is-user]:rounded-2xl",
          "group-[.is-user]:bg-secondary group-[.is-user]:text-secondary-foreground",
          "group-[.is-assistant]:bg-transparent group-[.is-assistant]:text-foreground group-[.is-assistant]:px-0 group-[.is-assistant]:py-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
      {actions && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 transition-opacity duration-200 ease-in-out",
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
};
