"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { calendarItems, db } from "@/db";
import {
  isTaskCategoryKey,
  toCalendarItemRecord,
  type CalendarItemKind,
  type CalendarItemRecord,
  type TaskCategoryKey,
} from "@/lib/calendar";
import { requireCalendarUser } from "@/lib/calendar-user";

type CalendarItemInput = {
  title: string;
  notes?: string | null;
  categoryKey?: TaskCategoryKey | null;
  kind: CalendarItemKind;
  scheduledDate?: string | null;
};

type CalendarItemUpdate = Partial<CalendarItemInput>;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function cleanTitle(title: string) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("A title is required.");
  }

  return trimmedTitle.slice(0, 180);
}

function cleanNotes(notes?: string | null) {
  const trimmedNotes = notes?.trim();

  return trimmedNotes ? trimmedNotes.slice(0, 1200) : null;
}

function cleanDate(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!dateKeyPattern.test(value)) {
    throw new Error("Scheduled dates must use YYYY-MM-DD.");
  }

  return value;
}

function cleanCategory(kind: CalendarItemKind, value?: TaskCategoryKey | null) {
  if (kind === "reminder") {
    return null;
  }

  if (!value || !isTaskCategoryKey(value)) {
    throw new Error("Tasks need a valid category.");
  }

  return value;
}

async function ownedItem(id: number, userId: number) {
  return db.query.calendarItems.findFirst({
    where: and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)),
  });
}

export async function createCalendarItemAction(
  input: CalendarItemInput,
): Promise<CalendarItemRecord> {
  const user = await requireCalendarUser();
  const scheduledDate = cleanDate(input.scheduledDate);

  if (input.kind === "reminder" && !scheduledDate) {
    throw new Error("Reminders must be scheduled.");
  }

  const [createdItem] = await db
    .insert(calendarItems)
    .values({
      userId: user.id,
      kind: input.kind,
      title: cleanTitle(input.title),
      notes: cleanNotes(input.notes),
      categoryKey: cleanCategory(input.kind, input.categoryKey),
      scheduledDate,
    })
    .returning();

  revalidatePath("/calendar");
  return toCalendarItemRecord(createdItem);
}

export async function updateCalendarItemAction(
  id: number,
  input: CalendarItemUpdate,
): Promise<CalendarItemRecord> {
  const user = await requireCalendarUser();
  const currentItem = await ownedItem(id, user.id);

  if (!currentItem) {
    throw new Error("Calendar item not found.");
  }

  const kind =
    input.kind === "task" || input.kind === "reminder"
      ? input.kind
      : currentItem.kind === "reminder"
        ? "reminder"
        : "task";
  const scheduledDate =
    "scheduledDate" in input ? cleanDate(input.scheduledDate) : currentItem.scheduledDate;

  if (kind === "reminder" && !scheduledDate) {
    throw new Error("Reminders must be scheduled.");
  }

  const [updatedItem] = await db
    .update(calendarItems)
    .set({
      kind,
      title: input.title === undefined ? currentItem.title : cleanTitle(input.title),
      notes: input.notes === undefined ? currentItem.notes : cleanNotes(input.notes),
      categoryKey:
        input.categoryKey === undefined && kind === currentItem.kind
          ? currentItem.categoryKey
          : cleanCategory(kind, input.categoryKey),
      scheduledDate,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, user.id)))
    .returning();

  revalidatePath("/calendar");
  return toCalendarItemRecord(updatedItem);
}

export async function deleteCalendarItemAction(id: number) {
  const user = await requireCalendarUser();
  const [deletedItem] = await db
    .delete(calendarItems)
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, user.id)))
    .returning({ id: calendarItems.id });

  if (!deletedItem) {
    throw new Error("Calendar item not found.");
  }

  revalidatePath("/calendar");
  return deletedItem.id;
}
