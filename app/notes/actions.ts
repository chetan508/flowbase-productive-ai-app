"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, notes, type Note } from "@/db";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export type NoteColor = "sky" | "rose" | "emerald" | "amber" | "violet";

export type NoteRecord = {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  trashed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = Partial<{
  title: string;
  content: string;
  color: NoteColor | string;
  pinned: boolean;
  trashed: boolean;
}>;

const noteColors: NoteColor[] = ["sky", "rose", "emerald", "amber", "violet"];

function cleanTitle(value: string | undefined, fallback = "Untitled note") {
  const title = value?.trim().replace(/\s+/g, " ") ?? "";
  return (title || fallback).slice(0, 180);
}

function cleanContent(value: string | undefined) {
  return (value ?? "<p></p>").slice(0, 60000);
}

function cleanColor(value: string | undefined): NoteColor {
  return noteColors.includes(value as NoteColor) ? (value as NoteColor) : "sky";
}

function toRecord(note: Note): NoteRecord {
  return {
    id: String(note.id),
    title: note.title,
    content: note.content,
    color: cleanColor(note.color),
    pinned: note.pinned === 1,
    trashed: note.trashed === 1,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

async function createStarterNotes(ownerId: number) {
  const created = await db
    .insert(notes)
    .values([
      {
        ownerId,
        title: "Weekly planning notes",
        color: "sky",
        pinned: 1,
        content:
          "<h2>Weekly planning notes</h2><p>Shape the week around fewer, clearer moves. Try selecting this sentence to open the bubble menu, or type / on a new line for commands.</p><ul><li>Review current tasks</li><li>Capture loose ideas</li><li>Turn decisions into next actions</li></ul>",
      },
      {
        ownerId,
        title: "Research snippets",
        color: "emerald",
        content:
          "<h2>Research snippets</h2><p>Collect useful fragments here, then refine them into a tighter brief.</p><blockquote>Good notes make the next version easier to see.</blockquote>",
      },
      {
        ownerId,
        title: "Launch ideas",
        color: "rose",
        content: "<h2>Launch ideas</h2><p>Draft announcement angles, customer examples, and follow-up tasks.</p>",
      },
    ])
    .returning();

  return created.map(toRecord);
}

export async function getNotesForCurrentUser(): Promise<NoteRecord[]> {
  const user = await requireWorkspaceUser();
  const userNotes = await db.query.notes.findMany({
    orderBy: [desc(notes.pinned), desc(notes.updatedAt), desc(notes.createdAt)],
    where: eq(notes.ownerId, user.id),
  });

  if (userNotes.length === 0) {
    return createStarterNotes(user.id);
  }

  return userNotes.map(toRecord);
}

export async function createNoteAction(input: NoteInput = {}): Promise<NoteRecord> {
  const user = await requireWorkspaceUser();
  const [created] = await db
    .insert(notes)
    .values({
      ownerId: user.id,
      title: cleanTitle(input.title),
      content: cleanContent(input.content),
      color: cleanColor(input.color),
      pinned: input.pinned ? 1 : 0,
      trashed: input.trashed ? 1 : 0,
    })
    .returning();

  revalidatePath("/notes");
  return toRecord(created);
}

export async function updateNoteAction(noteId: string | number, input: NoteInput): Promise<NoteRecord> {
  const user = await requireWorkspaceUser();
  const id = Number(noteId);
  if (!Number.isFinite(id)) {
    throw new Error("Note not found.");
  }

  const values: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) values.title = cleanTitle(input.title);
  if (input.content !== undefined) values.content = cleanContent(input.content);
  if (input.color !== undefined) values.color = cleanColor(input.color);
  if (input.pinned !== undefined) values.pinned = input.pinned ? 1 : 0;
  if (input.trashed !== undefined) values.trashed = input.trashed ? 1 : 0;

  const [updated] = await db
    .update(notes)
    .set(values)
    .where(and(eq(notes.id, id), eq(notes.ownerId, user.id)))
    .returning();

  if (!updated) {
    throw new Error("Note not found.");
  }

  revalidatePath("/notes");
  return toRecord(updated);
}

export async function softDeleteNoteAction(noteId: string | number): Promise<string> {
  const user = await requireWorkspaceUser();
  const id = Number(noteId);
  if (!Number.isFinite(id)) {
    throw new Error("Note not found.");
  }

  const [updated] = await db
    .update(notes)
    .set({ trashed: 1, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.ownerId, user.id)))
    .returning({ id: notes.id });

  if (!updated) {
    throw new Error("Note not found.");
  }

  revalidatePath("/notes");
  return String(updated.id);
}
