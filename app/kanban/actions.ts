"use server";

import { and, asc, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  db,
  kanbanBoardMembers,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  users,
  type User,
} from "@/db";
import {
  cleanLabelIds,
  isPriority,
  toBoardRecord,
  toMemberRecord,
  type KanbanBoardRecord,
  type KanbanTaskInput,
} from "@/lib/kanban";
import { assertWithinFreeLimit, getCurrentPlanTier } from "@/lib/entitlements";
import { colorForIdentity, normalizeEmail } from "@/lib/identity";
import { tryEnsureKanbanRoom, tryGrantKanbanRoomAccess } from "@/lib/liveblocks";
import { requireWorkspaceUser } from "@/lib/workspace-user";

const maxColumns = 5;
const defaultBoardColor = "#38bdf8";
const boardColors = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#2dd4bf"];
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function cleanName(name: string, fallback = "Untitled") {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, 140);
}

function cleanDate(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!dateKeyPattern.test(value)) {
    throw new Error("Dates must use YYYY-MM-DD.");
  }

  return value;
}

function cleanColor(color: string) {
  return boardColors.includes(color) ? color : defaultBoardColor;
}

function cleanEmailInput(email: string) {
  const normalized = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  return normalized;
}

async function activatePendingMemberships(user: User) {
  await db
    .update(kanbanBoardMembers)
    .set({ userId: user.id, status: "active", updatedAt: new Date() })
    .where(eq(kanbanBoardMembers.email, user.email));
}

async function loadBoardRecord(boardId: number): Promise<KanbanBoardRecord | null> {
  const board = await db.query.kanbanBoards.findFirst({
    where: eq(kanbanBoards.id, boardId),
  });

  if (!board) {
    return null;
  }

  const [columns, tasks, members] = await Promise.all([
    db.query.kanbanColumns.findMany({
      orderBy: [asc(kanbanColumns.position), asc(kanbanColumns.createdAt)],
      where: eq(kanbanColumns.boardId, boardId),
    }),
    db.query.kanbanTasks.findMany({
      orderBy: [asc(kanbanTasks.position), asc(kanbanTasks.createdAt)],
      where: eq(kanbanTasks.boardId, boardId),
    }),
    db.query.kanbanBoardMembers.findMany({
      orderBy: [asc(kanbanBoardMembers.createdAt)],
      where: eq(kanbanBoardMembers.boardId, boardId),
    }),
  ]);

  const memberUsers = await Promise.all(
    members.map((member) =>
      member.userId
        ? db.query.users.findFirst({ where: eq(users.id, member.userId) })
        : db.query.users.findFirst({ where: eq(users.email, member.email) }),
    ),
  );

  return toBoardRecord(
    board,
    columns,
    tasks,
    members.map((member, index) => toMemberRecord(member, memberUsers[index] ?? null)),
  );
}

async function requireBoardAccess(boardId: number, user: User) {
  const board = await db.query.kanbanBoards.findFirst({
    where: eq(kanbanBoards.id, boardId),
  });

  if (!board) {
    throw new Error("Board not found.");
  }

  if (board.ownerId === user.id) {
    return board;
  }

  const member = await db.query.kanbanBoardMembers.findFirst({
    where: and(
      eq(kanbanBoardMembers.boardId, boardId),
      or(eq(kanbanBoardMembers.userId, user.id), eq(kanbanBoardMembers.email, user.email)),
    ),
  });

  if (!member) {
    throw new Error("You do not have access to this board.");
  }

  if (member.status !== "active" || member.userId !== user.id) {
    await db
      .update(kanbanBoardMembers)
      .set({ status: "active", userId: user.id, updatedAt: new Date() })
      .where(eq(kanbanBoardMembers.id, member.id));
  }

  return board;
}

async function nextTaskPosition(columnId: number) {
  const tasks = await db.query.kanbanTasks.findMany({
    where: eq(kanbanTasks.columnId, columnId),
  });

  return tasks.length;
}

export async function getKanbanBoardsForCurrentUser(): Promise<KanbanBoardRecord[]> {
  const user = await requireWorkspaceUser();
  await activatePendingMemberships(user);

  const [ownedBoards, memberships] = await Promise.all([
    db.query.kanbanBoards.findMany({
      orderBy: [asc(kanbanBoards.createdAt)],
      where: eq(kanbanBoards.ownerId, user.id),
    }),
    db.query.kanbanBoardMembers.findMany({
      orderBy: [asc(kanbanBoardMembers.createdAt)],
      where: or(eq(kanbanBoardMembers.userId, user.id), eq(kanbanBoardMembers.email, user.email)),
    }),
  ]);

  const ids = Array.from(
    new Set([...ownedBoards.map((board) => board.id), ...memberships.map((member) => member.boardId)]),
  );

  if (ids.length === 0) {
    const board = await createStarterBoard(user);
    return [board];
  }

  const records = await Promise.all(ids.map(loadBoardRecord));
  return records.filter((board): board is KanbanBoardRecord => Boolean(board));
}

async function createStarterBoard(user: User) {
  const [board] = await db
    .insert(kanbanBoards)
    .values({
      name: "Weekly Flow",
      color: defaultBoardColor,
      ownerId: user.id,
    })
    .returning();

  const [todo, doing, done] = await db
    .insert(kanbanColumns)
    .values([
      { boardId: board.id, name: "Todo", position: 0 },
      { boardId: board.id, name: "In Progress", position: 1 },
      { boardId: board.id, name: "Done", position: 2 },
    ])
    .returning();

  await Promise.all([
    db.insert(kanbanBoardMembers).values({
      boardId: board.id,
      userId: user.id,
      email: user.email,
      role: "owner",
      status: "active",
    }),
    db.insert(kanbanTasks).values([
      {
        boardId: board.id,
        columnId: todo.id,
        title: "Shape onboarding checklist",
        description: "Turn the latest notes into a focused first-pass task list.",
        dueDate: todayKey(),
        priority: "High",
        labelIds: "work,focus",
        syncCalendar: 1,
        linkNotes: 1,
        position: 0,
      },
      {
        boardId: board.id,
        columnId: todo.id,
        title: "Collect visual references",
        description: "Pull warm UI examples for the next workspace polish pass.",
        dueDate: todayKey(),
        priority: "Medium",
        labelIds: "design",
        syncCalendar: 0,
        linkNotes: 1,
        position: 1,
      },
      {
        boardId: board.id,
        columnId: doing.id,
        title: "Review calendar flow",
        description: "Check the drag states and empty states before shipping.",
        dueDate: todayKey(),
        priority: "Low",
        labelIds: "focus",
        syncCalendar: 1,
        linkNotes: 0,
        position: 0,
      },
    ]),
  ]);

  await tryEnsureKanbanRoom(board.id, [user.email]);

  const record = await loadBoardRecord(board.id);
  if (!record) {
    throw new Error("Starter board could not be loaded.");
  }

  return record;
}

export async function createBoardAction(input: { name: string; color: string }) {
  const user = await requireWorkspaceUser();
  await assertWithinFreeLimit(user, "kanbanBoards", await getCurrentPlanTier());
  const [board] = await db
    .insert(kanbanBoards)
    .values({
      name: cleanName(input.name, "New board"),
      color: cleanColor(input.color),
      ownerId: user.id,
    })
    .returning();

  await Promise.all([
    db.insert(kanbanBoardMembers).values({
      boardId: board.id,
      userId: user.id,
      email: user.email,
      role: "owner",
      status: "active",
    }),
    db.insert(kanbanColumns).values([
      { boardId: board.id, name: "Todo", position: 0 },
      { boardId: board.id, name: "In Progress", position: 1 },
      { boardId: board.id, name: "Done", position: 2 },
    ]),
  ]);

  await tryEnsureKanbanRoom(board.id, [user.email]);
  revalidatePath("/kanban");

  return loadBoardRecord(board.id);
}

export async function addColumnAction(boardId: number, name: string) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  const columns = await db.query.kanbanColumns.findMany({
    where: eq(kanbanColumns.boardId, boardId),
  });

  if (columns.length >= maxColumns) {
    throw new Error("Each board can have up to 5 columns.");
  }

  await db.insert(kanbanColumns).values({
    boardId,
    name: cleanName(name, "New column"),
    position: columns.length,
  });

  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function updateColumnAction(boardId: number, columnId: number, name: string) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  await db
    .update(kanbanColumns)
    .set({ name: cleanName(name, "Column"), updatedAt: new Date() })
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId)));

  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function deleteColumnAction(boardId: number, columnId: number) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  await db
    .delete(kanbanColumns)
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId)));

  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function saveTaskAction(input: KanbanTaskInput) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(input.boardId, user);

  const priority = isPriority(input.priority) ? input.priority : "Medium";
  const values = {
    boardId: input.boardId,
    columnId: input.columnId,
    title: cleanName(input.title, ""),
    description: input.description.trim().slice(0, 1200),
    dueDate: cleanDate(input.dueDate),
    priority,
    labelIds: cleanLabelIds(input.labelIds),
    syncCalendar: input.syncCalendar ? 1 : 0,
    linkNotes: input.linkNotes ? 1 : 0,
    updatedAt: new Date(),
  };

  if (!values.title) {
    throw new Error("A task title is required.");
  }

  if (input.id) {
    await db
      .update(kanbanTasks)
      .set(values)
      .where(and(eq(kanbanTasks.id, input.id), eq(kanbanTasks.boardId, input.boardId)));
  } else {
    await db.insert(kanbanTasks).values({
      ...values,
      position: await nextTaskPosition(input.columnId),
    });
  }

  revalidatePath("/kanban");
  return loadBoardRecord(input.boardId);
}

export async function moveTaskAction(boardId: number, taskId: number, targetColumnId: number) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  await db
    .update(kanbanTasks)
    .set({
      columnId: targetColumnId,
      position: await nextTaskPosition(targetColumnId),
      updatedAt: new Date(),
    })
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.boardId, boardId)));

  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function deleteTaskAction(boardId: number, taskId: number) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  await db.delete(kanbanTasks).where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.boardId, boardId)));

  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function inviteBoardMemberAction(boardId: number, emailInput: string) {
  const user = await requireWorkspaceUser();
  await requireBoardAccess(boardId, user);

  const email = cleanEmailInput(emailInput);
  const invitedUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  const existingMember = await db.query.kanbanBoardMembers.findFirst({
    where: and(eq(kanbanBoardMembers.boardId, boardId), eq(kanbanBoardMembers.email, email)),
  });

  if (existingMember) {
    await db
      .update(kanbanBoardMembers)
      .set({
        userId: existingMember.userId ?? invitedUser?.id ?? null,
        status: invitedUser ? "active" : existingMember.status,
        updatedAt: new Date(),
      })
      .where(eq(kanbanBoardMembers.id, existingMember.id));
  } else {
    await db.insert(kanbanBoardMembers).values({
      boardId,
      userId: invitedUser?.id ?? null,
      email,
      role: "editor",
      status: invitedUser ? "active" : "pending",
    });
  }

  await tryGrantKanbanRoomAccess(boardId, email);
  revalidatePath("/kanban");
  return loadBoardRecord(boardId);
}

export async function resolveLiveblocksUsersAction(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const normalizedIds = userIds.map(normalizeEmail);
  const foundUsers = await db.query.users.findMany({
    where: inArray(users.email, normalizedIds),
  });

  return normalizedIds.map((email) => {
    const user = foundUsers.find((item) => item.email === email);
    const name = user?.name ?? email.split("@")[0] ?? "Collaborator";

    return {
      name,
      email,
      color: colorForIdentity(email),
    };
  });
}
