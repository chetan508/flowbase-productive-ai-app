"use client";

import {
  Bot,
  CalendarPlus,
  Check,
  KanbanSquare,
  Loader2,
  Mic,
  NotebookPen,
  Send,
  Sparkles,
  Square,
  WandSparkles,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  sendAssistantMessageAction,
  type AssistantChatMessage,
  type PendingAssistantAction,
} from "@/app/assistant/actions";
import { useAssemblyAIStreaming } from "@/hooks/use-assemblyai-streaming";

type ChatMessage = AssistantChatMessage & {
  id: string;
  pendingAction?: PendingAssistantAction;
};

const suggestions = [
  { label: "Create a task for tomorrow", icon: Check },
  { label: "Add meeting reminder on calendar", icon: CalendarPlus },
  { label: "Summarize my notes", icon: NotebookPen },
  { label: "Create a Kanban board", icon: KanbanSquare },
  { label: "Plan my week", icon: Sparkles },
  { label: "Generate a habit tracker template", icon: WandSparkles },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isWordLike(value: string) {
  return /[A-Za-z0-9]$/.test(value);
}

export function AssistantWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAssistantAction | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertTranscript = useCallback((chunk: string) => {
    const nextChunk = chunk.replace(/\s+/g, " ").trim();
    if (!nextChunk) return;

    setPrompt((current) => {
      const needsSpace = current && isWordLike(current.trimEnd().slice(-1)) && isWordLike(nextChunk.charAt(0));
      return `${current}${needsSpace ? " " : ""}${nextChunk}`;
    });
  }, []);

  const speech = useAssemblyAIStreaming({
    onFinalTranscript: insertTranscript,
    onStop: (reason) => {
      if (reason === "limit") setStatus("Listening stopped after 2 minutes.");
      if (reason === "manual") textareaRef.current?.focus();
    },
    onError: setStatus,
  });

  const recordingBusy = speech.status === "connecting" || speech.status === "recording" || speech.status === "stopping";
  const voiceLabel =
    speech.status === "connecting"
      ? "Connecting"
      : speech.status === "recording"
        ? "Listening"
        : speech.status === "stopping"
          ? "Processing"
          : "Talk";
  const actionHint = useMemo(() => {
    if (!pendingAction) return null;
    return `Pending confirmation: ${pendingAction.summary}`;
  }, [pendingAction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isResponding]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function submitMessage(value: string) {
    const content = value.trim();
    if (!content || isResponding) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setStatus(null);
    setIsResponding(true);

    try {
      const response = await sendAssistantMessageAction({
        messages: nextMessages.map(({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        })),
        pendingAction,
      });

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: response.content,
        pendingAction: response.pendingAction,
      };
      setMessages((current) => [...current, assistantMessage]);
      setPendingAction(response.pendingAction ?? null);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "I could not complete that request.",
        },
      ]);
    } finally {
      setIsResponding(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(prompt);
  }

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }

  useEffect(resizeTextarea, [prompt]);

  return (
    <div className="flex h-full min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-white/80 bg-white/75 shadow-sm shadow-slate-200/60">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-100/80 bg-white/80 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white shadow-sm shadow-cyan-200">
            <Bot aria-hidden="true" className="size-5 text-cyan-200" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-950">AI Assistant</h1>
            <p className="truncate text-xs text-slate-500">Ask, plan, and prepare workspace actions</p>
          </div>
        </div>
        {pendingAction && (
          <span className="hidden rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 md:inline-flex">
            Confirmation needed
          </span>
        )}
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          {messages.length === 0 ? (
            <div className="my-auto py-6 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm shadow-cyan-200">
                <Sparkles aria-hidden="true" className="size-6 text-amber-300" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">AI Assistant</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Chat with Flowbase to answer questions, shape plans, and prepare actions across your workspace.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      className="group flex min-h-20 items-start gap-3 rounded-lg border border-cyan-100 bg-white/85 p-3 text-left shadow-sm shadow-slate-200/50 transition hover:border-cyan-200 hover:bg-cyan-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      key={suggestion.label}
                      disabled={isResponding}
                      onClick={() => void submitMessage(suggestion.label)}
                      type="button"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-950 text-white transition group-hover:scale-105">
                        <Icon aria-hidden="true" className="size-4 text-cyan-200" />
                      </span>
                      <span className="text-sm font-medium leading-5 text-slate-800">{suggestion.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <article
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  {message.role === "assistant" && (
                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-md bg-cyan-100 text-cyan-800">
                      <Bot aria-hidden="true" className="size-4" />
                    </span>
                  )}
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-slate-950 text-white shadow-slate-200"
                        : "border border-cyan-100 bg-white text-slate-700 shadow-slate-200/70"
                    }`}
                  >
                    {message.content}
                    {message.pendingAction && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">
                        Reply "yes" to confirm or "cancel" to skip.
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {isResponding && (
                <article className="flex gap-3">
                  <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-md bg-cyan-100 text-cyan-800">
                    <Bot aria-hidden="true" className="size-4" />
                  </span>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-100 bg-white px-3.5 py-2.5 text-sm text-slate-600 shadow-sm shadow-slate-200/70">
                    <Loader2 aria-hidden="true" className="size-4 animate-spin text-cyan-600" />
                    Thinking
                  </div>
                </article>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </section>

      <footer className="shrink-0 border-t border-cyan-100/80 bg-white/90 px-3 py-3 sm:px-5">
        <div className="mx-auto w-full max-w-3xl">
          {(actionHint || speech.livePreview || status || speech.error) && (
            <div className="mb-2 space-y-2" aria-live="polite">
              {actionHint && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {actionHint}
                </div>
              )}
              {speech.livePreview && (
                <div className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mr-2 font-medium text-cyan-800">Listening</span>
                  {speech.livePreview}
                </div>
              )}
              {(status || speech.error) && (
                <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {status || speech.error}
                </div>
              )}
            </div>
          )}

          <form className="flex items-end gap-2 rounded-lg border border-cyan-100 bg-white p-2 shadow-sm shadow-slate-200/70" onSubmit={onSubmit}>
            <button
              aria-label={speech.isRecording ? "Stop voice input" : "Start voice input"}
              className={`grid size-10 shrink-0 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                speech.isRecording
                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100 disabled:opacity-60"
              }`}
              disabled={speech.status === "connecting" || speech.status === "stopping"}
              onClick={() => {
                if (speech.isRecording) {
                  void speech.stop();
                } else {
                  void speech.start();
                }
              }}
              title={voiceLabel}
              type="button"
            >
              {speech.isRecording ? <Square aria-hidden="true" className="size-4 fill-current" /> : <Mic aria-hidden="true" className="size-4" />}
            </button>
            <textarea
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
              disabled={isResponding}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage(prompt);
                }
              }}
              placeholder={pendingAction ? "Reply yes to confirm, or ask for a change" : "Ask Flowbase to plan, create, summarize, or update..."}
              ref={textareaRef}
              rows={1}
              value={prompt}
            />
            <button
              aria-label="Send message"
              className="grid size-10 shrink-0 place-items-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isResponding || recordingBusy || !prompt.trim()}
              type="submit"
            >
              {isResponding ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
            </button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Shift + Enter for a new line</span>
            <span className="inline-flex items-center gap-1">
              <Workflow aria-hidden="true" className="size-3.5 text-cyan-600" />
              {voiceLabel}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
