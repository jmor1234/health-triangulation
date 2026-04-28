"use client";

import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageEditButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 gap-1.5 cursor-pointer transition-colors", className)}
      onClick={onClick}
      aria-label="Edit message"
    >
      <PencilIcon className="h-3.5 w-3.5" />
      <span className="text-xs">Edit</span>
    </Button>
  );
}
