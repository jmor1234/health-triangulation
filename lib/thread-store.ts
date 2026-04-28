"use client";

import Dexie, { type Table } from "dexie";
import { nanoid } from "nanoid";
import type { UIMessage } from "ai";

export interface ThreadMeta {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
}

interface ThreadMessages {
  threadId: string;
  messages: UIMessage[];
}

class ThreadDB extends Dexie {
  threads!: Table<ThreadMeta, string>;
  messages!: Table<ThreadMessages, string>;

  constructor() {
    super("health-triangulation-threads");
    this.version(1).stores({
      threads: "id, updatedAt",
      messages: "threadId",
    });
  }
}

let db: ThreadDB | null = null;

function getDB(): ThreadDB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = new ThreadDB();
  return db;
}

function extractPlainText(msg: UIMessage): string {
  return msg.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string"
    )
    .map((p) => p.text)
    .join(" ")
    .trim();
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const raw = firstUser ? extractPlainText(firstUser) : "";
  if (!raw) return "New conversation";
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}

function derivePreview(messages: UIMessage[]): string {
  const lastAssistant = messages.findLast((m) => m.role === "assistant");
  if (!lastAssistant) return "";
  const raw = extractPlainText(lastAssistant);
  const singleLine = raw.replace(/\n/g, " ").trim();
  return singleLine.length > 120
    ? `${singleLine.slice(0, 117)}…`
    : singleLine;
}

export async function createThread(): Promise<ThreadMeta> {
  const d = getDB();
  if (!d) throw new Error("IndexedDB unavailable");

  const thread: ThreadMeta = {
    id: `thr_${nanoid(12)}`,
    title: "New conversation",
    preview: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await d.transaction("rw", [d.threads, d.messages], async () => {
    await d.threads.add(thread);
    await d.messages.add({ threadId: thread.id, messages: [] });
  });

  return thread;
}

export async function listThreads(): Promise<ThreadMeta[]> {
  const d = getDB();
  if (!d) return [];
  return d.threads.orderBy("updatedAt").reverse().toArray();
}

export async function getLatestThread(): Promise<ThreadMeta | undefined> {
  const d = getDB();
  if (!d) return undefined;
  return d.threads.orderBy("updatedAt").reverse().first();
}

export async function deleteThread(id: string): Promise<void> {
  const d = getDB();
  if (!d) return;
  await d.transaction("rw", [d.threads, d.messages], async () => {
    await d.threads.delete(id);
    await d.messages.delete(id);
  });
}

export async function renameThread(id: string, title: string): Promise<void> {
  const d = getDB();
  if (!d) return;
  await d.threads.update(id, {
    title: title.slice(0, 80),
    updatedAt: Date.now(),
  });
}

export async function loadMessages(threadId: string): Promise<UIMessage[]> {
  const d = getDB();
  if (!d) return [];
  const row = await d.messages.get(threadId);
  return row?.messages ?? [];
}

export async function saveMessages(
  threadId: string,
  messages: UIMessage[]
): Promise<void> {
  const d = getDB();
  if (!d) return;

  const title = deriveTitle(messages);
  const preview = derivePreview(messages);

  await d.transaction("rw", [d.threads, d.messages], async () => {
    await d.messages.put({ threadId, messages });
    await d.threads.update(threadId, {
      title,
      preview,
      updatedAt: Date.now(),
    });
  });
}
