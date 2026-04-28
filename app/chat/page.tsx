"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLatestThread, createThread } from "@/lib/thread-store";

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

  return null;
}
