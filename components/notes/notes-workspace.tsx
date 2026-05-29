"use client";

import {
  Copy,
  MoreHorizontal,
  NotebookPen,
  Palette,
  Pin,
  PinOff,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  createNoteAction,
  softDeleteNoteAction,
  updateNoteAction,
  type NoteColor,
  type NoteRecord,
} from "@/app/notes/actions";
import { NotesEditor } from "@/components/notes/notes-editor";

export type NotePage = NoteRecord;

const colorStyles: Record<NoteColor, { dot: string; soft: string; label: string }> = {
  sky: { dot: "bg-sky-400", soft: "bg-sky-50 text-sky-700", label: "Blue" },
  rose: { dot: "bg-rose-400", soft: "bg-rose-50 text-rose-700", label: "Rose" },
  emerald: { dot: "bg-emerald-400", soft: "bg-emerald-50 text-emerald-700", label: "Green" },
  amber: { dot: "bg-amber-400", soft: "bg-amber-50 text-amber-700", label: "Amber" },
  violet: { dot: "bg-violet-400", soft: "bg-violet-50 text-violet-700", label: "Violet" },
};

function formatUpdatedAt(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function NotesWorkspace({ initialNotes }: { initialNotes: NotePage[] }) {
  const [notes, setNotes] = useState<NotePage[]>(initialNotes);
  const [selectedId, setSelectedId] = useState(initialNotes.find((note) => !note.trashed)?.id ?? "");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimersRef = useRef<Map<string, number>>(new Map());

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes
      .filter((note) => !note.trashed)
      .filter((note) => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search]);

  const trashedCount = notes.filter((note) => note.trashed).length;
  const selectedNote = notes.find((note) => note.id === selectedId && !note.trashed) ?? visibleNotes[0];

  useEffect(() => {
    if (!selectedNote && visibleNotes[0]) {
      setSelectedId(visibleNotes[0].id);
    }
  }, [selectedNote, visibleNotes]);

  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      saveTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  function queueSave(id: string, patch: Partial<NotePage>) {
    const currentTimer = saveTimersRef.current.get(id);
    if (currentTimer) window.clearTimeout(currentTimer);

    const timer = window.setTimeout(async () => {
      saveTimersRef.current.delete(id);
      try {
        const updated = await updateNoteAction(id, patch);
        setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...updated } : note)));
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Note update failed.");
      }
    }, 550);

    saveTimersRef.current.set(id, timer);
  }

  function updateNote(id: string, patch: Partial<NotePage>) {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: patch.updatedAt ?? new Date().toISOString() } : note,
      ),
    );
    queueSave(id, patch);
  }

  function addNote() {
    startTransition(async () => {
      try {
        const note = await createNoteAction({ color: "amber" });
        setNotes((current) => [note, ...current]);
        setSelectedId(note.id);
        setFeedback("Note created.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Note creation failed.");
      }
    });
  }

  function duplicateNote(note: NotePage) {
    startTransition(async () => {
      try {
        const copyNote = await createNoteAction({
          title: `${note.title} copy`,
          content: note.content,
          color: note.color,
        });
        setNotes((current) => [copyNote, ...current]);
        setSelectedId(copyNote.id);
        setOpenMenuId(null);
        setFeedback("Note duplicated.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Note duplication failed.");
      }
    });
  }

  function deleteNote(id: string) {
    setNotes((current) => current.map((note) => (note.id === id ? { ...note, trashed: true, updatedAt: new Date().toISOString() } : note)));
    setSelectedId((currentId) => (currentId === id ? visibleNotes.find((note) => note.id !== id)?.id ?? "" : currentId));
    setOpenMenuId(null);
    startTransition(async () => {
      try {
        await softDeleteNoteAction(id);
        setFeedback("Note moved to trash.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Note delete failed.");
      }
    });
  }

  function renameNote(note: NotePage) {
    const nextTitle = window.prompt("Rename note", note.title)?.trim();
    if (nextTitle) updateNote(note.id, { title: nextTitle });
    setOpenMenuId(null);
  }

  return (
    <div className="panel-enter flex h-full min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-white/80 bg-white/70 shadow-sm shadow-slate-200/60 lg:flex-row">
      <aside className="flex max-h-[44vh] min-h-0 w-full shrink-0 flex-col border-b border-cyan-100/80 bg-[color:var(--soft-panel)]/90 lg:max-h-none lg:w-[326px] lg:border-b-0 lg:border-r">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-cyan-700">Notes</p>
              <h1 className="truncate text-xl font-semibold text-slate-950">Thought pages</h1>
            </div>
            <button
              aria-label="New Note"
              className="pressable inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={addNote}
              disabled={isPending}
              title="New Note"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>

          <label className="flex h-10 items-center gap-2 rounded-md border border-cyan-100 bg-white/85 px-3 text-sm text-slate-500 shadow-sm shadow-slate-200/50">
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes"
              value={search}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {visibleNotes.map((note) => {
            const active = note.id === selectedNote?.id;
            return (
              <div className="group relative" key={note.id}>
                <button
                  className={`selectable-motion pressable group flex w-full min-w-0 items-center gap-3 rounded-md border p-2.5 text-left transition ${
                    active
                      ? "selected-glow border-cyan-200 bg-white shadow-sm shadow-cyan-100/80"
                      : "border-transparent hover:-translate-y-0.5 hover:border-white hover:bg-white/70"
                  }`}
                  onClick={() => setSelectedId(note.id)}
                  type="button"
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-md ${colorStyles[note.color].soft}`}>
                    <NotebookPen aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className={`size-2 shrink-0 rounded-full ${colorStyles[note.color].dot}`} />
                      <span className="truncate text-sm font-semibold text-slate-900">{note.title}</span>
                      {note.pinned && <Star aria-hidden="true" className="size-3 shrink-0 fill-amber-300 text-amber-400" />}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{formatUpdatedAt(note.updatedAt)}</span>
                  </span>
                </button>
                <button
                  aria-label={`Actions for ${note.title}`}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-800 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => setOpenMenuId((current) => (current === note.id ? null : note.id))}
                  type="button"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </button>
                {openMenuId === note.id && (
                  <div className="panel-enter absolute right-2 top-10 z-20 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                    <button className="note-menu-item" onClick={() => renameNote(note)} type="button">
                      <NotebookPen aria-hidden="true" className="size-4" /> Rename
                    </button>
                    <button className="note-menu-item" onClick={() => duplicateNote(note)} type="button">
                      <Copy aria-hidden="true" className="size-4" /> Duplicate
                    </button>
                    <button className="note-menu-item" onClick={() => updateNote(note.id, { pinned: !note.pinned })} type="button">
                      {note.pinned ? <PinOff aria-hidden="true" className="size-4" /> : <Pin aria-hidden="true" className="size-4" />}
                      {note.pinned ? "Unpin note" : "Pin note"}
                    </button>
                    <div className="px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Palette aria-hidden="true" className="size-3.5" /> Color
                      </div>
                      <div className="flex gap-1.5">
                        {(Object.keys(colorStyles) as NoteColor[]).map((color) => (
                          <button
                            aria-label={`${colorStyles[color].label} note color`}
                            className={`size-5 rounded-full border-2 border-white ${colorStyles[color].dot} ring-offset-1 ${
                              note.color === color ? "ring-2 ring-slate-400" : ""
                            }`}
                            key={color}
                            onClick={() => updateNote(note.id, { color })}
                            type="button"
                          />
                        ))}
                      </div>
                    </div>
                    <button className="note-menu-item text-rose-600 hover:bg-rose-50" onClick={() => deleteNote(note.id)} type="button">
                      <Trash2 aria-hidden="true" className="size-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-cyan-100/80 p-3">
          <button className="flex h-10 w-full items-center justify-between rounded-md px-2 text-sm text-slate-500 transition hover:bg-white/80 hover:text-slate-800" type="button">
            <span className="inline-flex items-center gap-2">
              <Trash2 aria-hidden="true" className="size-4 text-slate-400" />
              Trash
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-500">{trashedCount}</span>
          </button>
        </div>
      </aside>

      <section className="min-h-[52vh] flex-1 overflow-hidden bg-white lg:min-h-0">
        {selectedNote ? (
          <NotesEditor note={selectedNote} onChange={(patch) => updateNote(selectedNote.id, patch)} />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div>
              <NotebookPen aria-hidden="true" className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No notes found</p>
              <button className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" onClick={addNote} type="button">
                Create note
              </button>
            </div>
          </div>
        )}
      </section>
      {feedback && (
        <p
          aria-live="polite"
          className="toast-pop fixed bottom-4 right-4 z-20 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
