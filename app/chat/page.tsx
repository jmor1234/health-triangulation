"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLatestThread, createThread } from "@/lib/thread-store";
import { Loader } from "@/components/ai-elements/loader";

export default function ChatIndexPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const latest = await getLatestThread();
      if (latest) {
        router.replace(`/chat/${latest.id}`);
      } else {
        const thread = await createThread();
        router.replace(`/chat/${thread.id}`);
      }
    })();
  }, [router]);

  return (
    <div
      className="flex flex-1 items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader className="text-muted-foreground/60" size={20} />
      <span className="sr-only">Loading conversation…</span>
    </div>
  );
}
