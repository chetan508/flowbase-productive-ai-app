"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, whiteboards, type WhiteboardScene } from "@/db";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export type WhiteboardRecord = {
  id: number;
  name: string;
  color: string;
  scene: WhiteboardScene;
  updatedAt: string;
  createdAt: string;
};

const defaultBoardColor = "#38bdf8";
const boardColors = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#2dd4bf"];

const emptyScene: WhiteboardScene = {
  elements: [],
  appState: {
    currentItemBackgroundColor: "transparent",
    currentItemStrokeColor: "#1e293b",
    currentItemFontSize: 20,
    viewBackgroundColor: "#ffffff",
  },
  files: {},
};

function cleanName(name: string | undefined, fallback = "Untitled whiteboard") {
  const trimmed = name?.trim() ?? "";
  return (trimmed || fallback).slice(0, 120);
}

function cleanColor(color: string | undefined) {
  return color && boardColors.includes(color) ? color : defaultBoardColor;
}

function cleanScene(scene: WhiteboardScene): WhiteboardScene {
  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: scene.appState && typeof scene.appState === "object" ? scene.appState : {},
    files: scene.files && typeof scene.files === "object" ? scene.files : {},
  };
}

function toRecord(board: typeof whiteboards.$inferSelect): WhiteboardRecord {
  return {
    id: board.id,
    name: board.name,
    color: board.color,
    scene: cleanScene(board.scene),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

async function requireWhiteboardAccess(boardId: number) {
  const user = await requireWorkspaceUser();
  const board = await db.query.whiteboards.findFirst({
    where: and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, user.id)),
  });

  if (!board) {
    throw new Error("Whiteboard not found.");
  }

  return { board, user };
}

async function createStarterWhiteboard(ownerId: number) {
  const [board] = await db
    .insert(whiteboards)
    .values({
      ownerId,
      name: "Product launch map",
      color: defaultBoardColor,
      scene: emptyScene,
    })
    .returning();

  return toRecord(board);
}

export async function getWhiteboardsForCurrentUser(): Promise<WhiteboardRecord[]> {
  const user = await requireWorkspaceUser();
  const boards = await db.query.whiteboards.findMany({
    orderBy: [desc(whiteboards.updatedAt), desc(whiteboards.createdAt)],
    where: eq(whiteboards.ownerId, user.id),
  });

  if (boards.length === 0) {
    return [await createStarterWhiteboard(user.id)];
  }

  return boards.map(toRecord);
}

export async function createWhiteboardAction(input?: { name?: string; color?: string }) {
  const user = await requireWorkspaceUser();
  const [board] = await db
    .insert(whiteboards)
    .values({
      ownerId: user.id,
      name: cleanName(input?.name, "Untitled whiteboard"),
      color: cleanColor(input?.color),
      scene: emptyScene,
    })
    .returning();

  revalidatePath("/whiteboard");
  return toRecord(board);
}

export async function renameWhiteboardAction(boardId: number, name: string) {
  await requireWhiteboardAccess(boardId);

  const [board] = await db
    .update(whiteboards)
    .set({ name: cleanName(name), updatedAt: new Date() })
    .where(eq(whiteboards.id, boardId))
    .returning();

  revalidatePath("/whiteboard");
  return toRecord(board);
}

export async function deleteWhiteboardAction(boardId: number) {
  const { user } = await requireWhiteboardAccess(boardId);

  await db.delete(whiteboards).where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, user.id)));

  const remaining = await db.query.whiteboards.findMany({
    orderBy: [desc(whiteboards.updatedAt), desc(whiteboards.createdAt)],
    where: eq(whiteboards.ownerId, user.id),
  });

  revalidatePath("/whiteboard");
  return remaining.map(toRecord);
}

export async function saveWhiteboardSceneAction(boardId: number, scene: WhiteboardScene) {
  await requireWhiteboardAccess(boardId);

  const [board] = await db
    .update(whiteboards)
    .set({ scene: cleanScene(scene), updatedAt: new Date() })
    .where(eq(whiteboards.id, boardId))
    .returning();

  revalidatePath("/whiteboard");
  return toRecord(board);
}
