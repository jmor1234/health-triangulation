"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatStatus, FileUIPart } from "ai";
import {
  Loader2Icon,
  PaperclipIcon,
  SendIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import NextImage from "next/image";
import {
  createContext,
  type ComponentProps,
  type FormEvent,
  type FormEventHandler,
  Fragment,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AttachmentsContextValue = {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);

export const usePromptInputAttachments = () => {
  const context = useContext(AttachmentsContext);
  if (!context)
    throw new Error("usePromptInputAttachments must be used within a PromptInput");
  return context;
};

async function compressImageIfNeeded(file: File): Promise<string> {
  const MAX_SIZE_MB = 2;
  const MAX_DIMENSION = 1920;
  const QUALITY = 0.8;

  if (file.size / (1024 * 1024) < MAX_SIZE_MB) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let { width, height } = img;
      const aspectRatio = width / height;
      if (width > MAX_DIMENSION) {
        width = MAX_DIMENSION;
        height = width / aspectRatio;
      }
      if (height > MAX_DIMENSION) {
        height = MAX_DIMENSION;
        width = height * aspectRatio;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PromptInputAttachment({
  data,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { data: FileUIPart & { id: string } }) {
  const attachments = usePromptInputAttachments();
  return (
    <div
      className={cn("group relative h-14 w-14 rounded-md border", className)}
      {...props}
    >
      {data.mediaType?.startsWith("image/") && data.url ? (
        <NextImage
          alt={data.filename || "attachment"}
          className="size-full rounded-md object-cover"
          height={56}
          src={data.url}
          width={56}
          unoptimized
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <PaperclipIcon className="size-4" />
        </div>
      )}
      <Button
        aria-label="Remove attachment"
        className="-right-1.5 -top-1.5 absolute h-6 w-6 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100"
        onClick={() => attachments.remove(data.id)}
        size="icon"
        type="button"
        variant="outline"
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function PromptInputAttachments({
  className,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: (attachment: FileUIPart & { id: string }) => React.ReactNode;
}) {
  const attachments = usePromptInputAttachments();
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setHeight(el.getBoundingClientRect().height),
    );
    ro.observe(el);
    setHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      aria-live="polite"
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-out",
        className,
      )}
      style={{ height: attachments.files.length ? height : 0 }}
      {...props}
    >
      <div className="flex flex-wrap gap-2 p-3 pt-3" ref={contentRef}>
        {attachments.files.map((file) => (
          <Fragment key={file.id}>{children(file)}</Fragment>
        ))}
      </div>
    </div>
  );
}

export const PromptInput = ({
  className,
  accept,
  multiple,
  onSubmit,
  children,
  ...props
}: Omit<HTMLAttributes<HTMLFormElement>, "onSubmit" | "children"> & {
  accept?: string;
  multiple?: boolean;
  children?: React.ReactNode;
  onSubmit: (
    message: { text?: string; files?: FileUIPart[] },
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) => {
  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const add = useCallback(
    (files: File[] | FileList) => {
      const incoming = Array.from(files);
      const accepted = accept?.includes("image/*")
        ? incoming.filter((f) => f.type.startsWith("image/"))
        : incoming;
      if (accepted.length === 0) return;

      setItems((prev) => {
        const next: (FileUIPart & { id: string })[] = [];
        for (const file of accepted) {
          const item = {
            id: nanoid(),
            type: "file" as const,
            url: URL.createObjectURL(file),
            mediaType: file.type,
            filename: file.name,
          };
          next.push(item);
          compressImageIfNeeded(file).then((compressedDataUrl) => {
            const match = /^data:([^;]+);/.exec(compressedDataUrl || "");
            const derivedMediaType = match?.[1];
            setItems((cur) =>
              cur.map((c) =>
                c.id === item.id
                  ? {
                      ...c,
                      url: compressedDataUrl,
                      mediaType: derivedMediaType || c.mediaType,
                    }
                  : c,
              ),
            );
          });
        }
        return prev.concat(next);
      });
    },
    [accept],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url?.startsWith("blob:")) URL.revokeObjectURL(found.url);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      for (const f of prev)
        if (f.url?.startsWith("blob:")) URL.revokeObjectURL(f.url);
      return [];
    });
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files?.length) add(e.dataTransfer.files);
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [add]);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const text = (formEl.elements.namedItem("message") as HTMLTextAreaElement)
      ?.value;
    const files: FileUIPart[] = items.map((item) => ({
      type: item.type,
      url: item.url,
      mediaType: item.mediaType,
      filename: item.filename,
    }));
    onSubmit({ text, files: files.length > 0 ? files : undefined }, event);
    clear();
    formEl.reset();
  };

  const ctx = useMemo<AttachmentsContextValue>(
    () => ({
      files: items,
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef: inputRef,
    }),
    [items, add, remove, clear, openFileDialog],
  );

  return (
    <AttachmentsContext.Provider value={ctx}>
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={(e) => {
          if (e.currentTarget.files) add(e.currentTarget.files);
          e.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <form
        ref={formRef}
        className={cn(
          "w-full overflow-hidden rounded-xl border bg-background shadow-sm",
          className,
        )}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </AttachmentsContext.Provider>
  );
};

export const PromptInputTextarea = ({
  className,
  placeholder = "Ask anything…",
  ...props
}: ComponentProps<typeof Textarea>) => {
  const attachments = usePromptInputAttachments();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    let supportsFieldSizing = false;
    try {
      supportsFieldSizing =
        typeof CSS !== "undefined" && CSS.supports("field-sizing: content");
    } catch {
      /* */
    }
    if (supportsFieldSizing) return;

    const autosize = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    autosize();
    el.addEventListener("input", autosize);
    const form = el.form;
    const handleReset = () => requestAnimationFrame(autosize);
    if (form) form.addEventListener("reset", handleReset);
    return () => {
      el.removeEventListener("input", autosize);
      if (form) form.removeEventListener("reset", handleReset);
    };
  }, []);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter") {
      if (e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      if (e.currentTarget.dataset.status === "streaming") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        attachments.add(imageFiles);
        e.preventDefault();
      }
    },
    [attachments],
  );

  return (
    <Textarea
      ref={textareaRef}
      className={cn(
        "w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0",
        "field-sizing-content bg-transparent dark:bg-transparent",
        "max-h-[40svh] min-h-0",
        "focus-visible:ring-0",
        className,
      )}
      name="message"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      rows={1}
      {...props}
    />
  );
};

export const PromptInputToolbar = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between p-1", className)}
    {...props}
  />
);

export const PromptInputButton = ({
  className,
  ...props
}: ComponentProps<typeof Button>) => (
  <Button
    variant="ghost"
    size="icon-sm"
    type="button"
    className={cn(className)}
    {...props}
  />
);

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon",
  status,
  children,
  ...props
}: ComponentProps<typeof Button> & { status?: ChatStatus }) => {
  let Icon = <SendIcon className="size-4" />;
  if (status === "submitted")
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  else if (status === "streaming") Icon = <SquareIcon className="size-4" />;

  const buttonType = status === "streaming" ? "button" : "submit";

  return (
    <Button
      className={cn("gap-1.5 rounded-lg", className)}
      size={size}
      type={buttonType}
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};
