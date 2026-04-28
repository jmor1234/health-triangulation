"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  listThreads,
  createThread,
  deleteThread,
  renameThread,
  type ThreadMeta,
} from "@/lib/thread-store";

const BASE_PATH = "/chat";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const { setOpenMobile } = useSidebar();

  const activeThreadId = pathname.split("/").pop() ?? "";
  const closeMobile = useCallback(() => setOpenMobile(false), [setOpenMobile]);

  useEffect(() => {
    listThreads().then((t) => {
      setThreads(t);
      setLoading(false);
    });
  }, [pathname]);

  const handleNewThread = useCallback(async () => {
    const thread = await createThread();
    setThreads((prev) => [thread, ...prev]);
    setOpenMobile(false);
    startTransition(() => {
      router.push(`${BASE_PATH}/${thread.id}`);
    });
  }, [router, setOpenMobile]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this conversation?")) return;
      await deleteThread(id);
      const remaining = await listThreads();
      setThreads(remaining);
      if (id === activeThreadId) {
        if (remaining.length > 0) {
          router.push(`${BASE_PATH}/${remaining[0].id}`);
        } else {
          const newThread = await createThread();
          setThreads([newThread]);
          router.push(`${BASE_PATH}/${newThread.id}`);
        }
      }
    },
    [activeThreadId, router],
  );

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      await renameThread(id, trimmed);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, title: trimmed.slice(0, 80) } : t,
        ),
      );
    },
    [],
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleNewThread}
                tooltip="New conversation"
              >
                <Plus className="size-4" />
                <span>New conversation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="shrink-0 group-data-[collapsible=icon]:hidden">
            <ModeToggle />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? null : threads.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                threads.map((thread) => (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    active={thread.id === activeThreadId}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onNavigate={closeMobile}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}

function ThreadItem({
  thread,
  active,
  onDelete,
  onRename,
  onNavigate,
}: {
  thread: ThreadMeta;
  active: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNavigate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = useCallback(() => {
    setEditing(false);
    if (editTitle.trim() && editTitle.trim() !== thread.title) {
      onRename(thread.id, editTitle.trim());
    } else {
      setEditTitle(thread.title);
    }
  }, [editTitle, thread.id, thread.title, onRename]);

  if (editing) {
    return (
      <SidebarMenuItem>
        <SidebarInput
          ref={inputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditing(false);
              setEditTitle(thread.title);
            }
          }}
          onBlur={commitRename}
          aria-label="Rename conversation"
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={thread.title}
        className="data-[active=true]:text-accent-brand"
      >
        <Link href={`/chat/${thread.id}`} onClick={onNavigate}>
          <MessageSquare className="size-4" />
          <span>{thread.title}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label="Thread actions">
            <MoreHorizontal className="size-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem
            onClick={() => {
              setEditTitle(thread.title);
              setEditing(true);
            }}
          >
            <Pencil className="size-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(thread.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
