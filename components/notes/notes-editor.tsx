"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CheckCircle2,
  ChevronDown,
  Heading1,
  Heading2,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Mic,
  Minus,
  Pilcrow,
  Quote,
  Sparkles,
  Square,
  UnderlineIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { NotePage } from "@/components/notes/notes-workspace";
import { useAssemblyAIStreaming } from "@/hooks/use-assemblyai-streaming";

type NotesEditorProps = {
  note: NotePage;
  onChange: (patch: Partial<NotePage>) => void;
};

const slashCommands = [
  { label: "Text", icon: Pilcrow, action: "paragraph" },
  { label: "Heading 1", icon: Heading1, action: "h1" },
  { label: "Heading 2", icon: Heading2, action: "h2" },
  { label: "Bulleted list", icon: List, action: "bullet" },
  { label: "Numbered list", icon: ListOrdered, action: "ordered" },
  { label: "Quote", icon: Quote, action: "quote" },
  { label: "Divider", icon: Minus, action: "divider" },
] as const;

const refineOptions = [
  "Improve grammar",
  "Rephrase",
  "Make shorter",
  "Make longer",
  "Simplify language",
  "Change tone",
] as const;

function refineText(text: string, option: (typeof refineOptions)[number]) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  switch (option) {
    case "Improve grammar":
      return trimmed.replace(/\s+/g, " ").replace(/^./, (match) => match.toUpperCase());
    case "Rephrase":
      return `In other words, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    case "Make shorter":
      return trimmed.split(/\s+/).slice(0, Math.max(4, Math.ceil(trimmed.split(/\s+/).length * 0.6))).join(" ");
    case "Make longer":
      return `${trimmed} This gives the idea more context, a clearer purpose, and a smoother path into the next thought.`;
    case "Simplify language":
      return trimmed
        .replace(/\butilize\b/gi, "use")
        .replace(/\bfacilitate\b/gi, "help")
        .replace(/\bapproximately\b/gi, "about")
        .replace(/\bcommence\b/gi, "start");
    case "Change tone":
      return `A warmer version: ${trimmed}`;
  }
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function isWordLike(value: string) {
  return /[A-Za-z0-9]$/.test(value);
}

export function NotesEditor({ note, onChange }: NotesEditorProps) {
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [slashOpen, setSlashOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [toast, setToast] = useState("");
  const voiceInsertPositionRef = useRef<number | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-700 underline decoration-sky-300 underline-offset-2",
        },
      }),
      Placeholder.configure({
        placeholder: "Press / for commands",
      }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: "notes-prose min-h-[54vh] max-w-none px-4 pb-24 pt-3 outline-none sm:px-8 lg:px-14",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setSaveState("saving");
      onChange({ content: currentEditor.getHTML() });
      const textBeforeCursor = currentEditor.state.doc.textBetween(
        Math.max(0, currentEditor.state.selection.from - 1),
        currentEditor.state.selection.from,
      );
      setSlashOpen(textBeforeCursor === "/");
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.isFocused) {
        voiceInsertPositionRef.current = currentEditor.state.selection.to;
      }
    },
  });

  const insertTranscriptChunk = useCallback(
    (chunk: string) => {
      if (!editor) return;
      const trimmedChunk = chunk.replace(/\s+/g, " ").trim();
      if (!trimmedChunk) return;

      const docSize = editor.state.doc.content.size;
      const savedPosition = voiceInsertPositionRef.current;
      const position = editor.isFocused
        ? editor.state.selection.to
        : typeof savedPosition === "number"
          ? Math.min(savedPosition, docSize)
          : docSize;
      const before = position > 1 ? editor.state.doc.textBetween(position - 1, position) : "";
      const after = position < docSize ? editor.state.doc.textBetween(position, position + 1) : "";
      const leadingSpace = before && isWordLike(before) && isWordLike(trimmedChunk.charAt(0)) ? " " : "";
      const trailingSpace = after && isWordLike(after) && isWordLike(trimmedChunk.charAt(trimmedChunk.length - 1)) ? " " : "";
      const text = `${leadingSpace}${trimmedChunk}${trailingSpace}`;

      editor.chain().focus().insertContentAt(position, text).run();
      voiceInsertPositionRef.current = position + text.length;
    },
    [editor],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const speech = useAssemblyAIStreaming({
    onFinalTranscript: insertTranscriptChunk,
    onStop: (reason) => {
      if (reason === "limit") {
        showToast("Recording stopped after 2 minutes.");
      }
    },
    onError: showToast,
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
    setSlashOpen(false);
    setAiOpen(false);
    voiceInsertPositionRef.current = null;
  }, [editor, note.id]);

  useEffect(() => {
    if (saveState !== "saving") return;
    const timeout = window.setTimeout(() => setSaveState("saved"), 650);
    return () => window.clearTimeout(timeout);
  }, [saveState, note.content]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const wordCount = useMemo(() => countWords(editor?.getText() ?? ""), [editor, note.content]);
  const recordingBusy = speech.status === "connecting" || speech.status === "recording" || speech.status === "stopping";
  const recordingLabel = speech.status === "connecting" ? "Connecting" : speech.status === "stopping" ? "Stopping" : "Speak to Note";

  function runSlashCommand(action: (typeof slashCommands)[number]["action"]) {
    if (!editor) return;
    const { from } = editor.state.selection;
    const chain = editor.chain().focus().deleteRange({ from: Math.max(1, from - 1), to: from });
    if (action === "paragraph") chain.setParagraph().run();
    if (action === "h1") chain.setNode("heading", { level: 1 }).run();
    if (action === "h2") chain.setNode("heading", { level: 2 }).run();
    if (action === "bullet") chain.toggleBulletList().run();
    if (action === "ordered") chain.toggleOrderedList().run();
    if (action === "quote") chain.toggleBlockquote().run();
    if (action === "divider") chain.setHorizontalRule().run();
    setSlashOpen(false);
  }

  function applyRefine(option: (typeof refineOptions)[number]) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    editor.chain().focus().insertContentAt({ from, to }, refineText(selectedText, option)).run();
    setAiOpen(false);
  }

  function setLink() {
    if (!editor) return;
    const href = window.prompt("Paste a link");
    if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-cyan-100/80 bg-white/95 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <input
            className="min-w-0 border-none bg-transparent text-2xl font-semibold text-slate-950 outline-none ring-0 placeholder:text-slate-300 focus:outline-none focus:ring-0"
            onChange={(event) => onChange({ title: event.target.value || "Untitled note" })}
            value={note.title}
          />
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-500">
            <button
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                speech.isRecording
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-cyan-100 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
              }`}
              disabled={recordingBusy}
              onClick={() => void speech.start()}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <span className={speech.isRecording ? "relative flex size-4 items-center justify-center" : ""}>
                {speech.isRecording && <span className="absolute inline-flex size-4 animate-ping rounded-full bg-rose-300 opacity-75" />}
                <Mic aria-hidden="true" className="relative size-4" />
              </span>
              {recordingLabel}
            </button>
            {speech.isRecording && (
              <button
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-2.5 font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={() => void speech.stop()}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                <Square aria-hidden="true" className="size-3.5 fill-current" />
                Stop Recording
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              {saveState === "saving" ? "Saving" : "Saved"}
            </span>
            <span>{wordCount} words</span>
          </div>
        </div>
        {(speech.livePreview || toast || speech.error) && (
          <div className="mt-3 flex flex-col gap-2" aria-live="polite">
            {speech.livePreview && (
              <div className="rounded-md border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-sm text-slate-700">
                <span className="mr-2 font-medium text-cyan-800">Listening</span>
                {speech.livePreview}
              </div>
            )}
            {(toast || speech.error) && (
              <div className="w-fit rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 shadow-sm shadow-amber-100/60">
                {toast || speech.error}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {editor && (
          <BubbleMenu
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-xl shadow-slate-300/40"
            editor={editor}
            options={{ offset: 8, placement: "top" }}
          >
            <button
              aria-label="Heading 1"
              className="bubble-button"
              onClick={() => editor.chain().focus().setNode("heading", { level: 1 }).run()}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <Heading1 aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="Heading 2"
              className="bubble-button"
              onClick={() => editor.chain().focus().setNode("heading", { level: 2 }).run()}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <Heading2 aria-hidden="true" className="size-4" />
            </button>
            <button aria-label="Bold" className="bubble-button" onClick={() => editor.chain().focus().toggleBold().run()} onMouseDown={(event) => event.preventDefault()} type="button">
              <Bold aria-hidden="true" className="size-4" />
            </button>
            <button aria-label="Italic" className="bubble-button" onClick={() => editor.chain().focus().toggleItalic().run()} onMouseDown={(event) => event.preventDefault()} type="button">
              <Italic aria-hidden="true" className="size-4" />
            </button>
            <button aria-label="Underline" className="bubble-button" onClick={() => editor.chain().focus().toggleUnderline().run()} onMouseDown={(event) => event.preventDefault()} type="button">
              <UnderlineIcon aria-hidden="true" className="size-4" />
            </button>
            <button aria-label="Link" className="bubble-button" onClick={setLink} onMouseDown={(event) => event.preventDefault()} type="button">
              <LinkIcon aria-hidden="true" className="size-4" />
            </button>
            <div className="relative">
              <button className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-950 px-2.5 text-xs font-medium text-white" onClick={() => setAiOpen((current) => !current)} onMouseDown={(event) => event.preventDefault()} type="button">
                <Sparkles aria-hidden="true" className="size-3.5 text-amber-300" />
                AI Refine
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
              {aiOpen && (
                <div className="absolute right-0 top-10 z-30 w-44 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                  {refineOptions.map((option) => (
                    <button className="note-menu-item" key={option} onClick={() => applyRefine(option)} onMouseDown={(event) => event.preventDefault()} type="button">
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </BubbleMenu>
        )}

        {slashOpen && (
          <div className="absolute left-8 top-24 z-20 w-64 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/80 sm:left-14 lg:left-20">
            {slashCommands.map((command) => {
              const Icon = command.icon;
              return (
                <button
                  className="note-menu-item"
                  key={command.label}
                  onClick={() => runSlashCommand(command.action)}
                  onMouseDown={(event) => event.preventDefault()}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {command.label}
                </button>
              );
            })}
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
