"use server";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, pages, spaceMembers, spaces, users, type Page, type Space, type SpaceMember, type User } from "@/db";
import { colorForIdentity, normalizeEmail } from "@/lib/identity";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export type PageTemplate = "Blank Page" | "Project Plan" | "Meeting Notes" | "PRD" | "Research Notes" | "Task Plan";

export type SpaceMemberRecord = {
  email: string;
  initials: string;
  color: string;
};

export type PageRecord = {
  id: number;
  spaceId: number;
  name: string;
  emoji: string;
  template: PageTemplate;
  type: string;
  description: string;
  favorite: boolean;
  archived: boolean;
  commentsCount: number;
  linkedTasksCount: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SpaceRecord = {
  id: number;
  name: string;
  description: string;
  color: string;
  favorite: boolean;
  archived: boolean;
  pageCount: number;
  pageNames: string[];
  members: SpaceMemberRecord[];
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
};

const spaceColors = ["#8b5cf6", "#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#2dd4bf"];
const templates: PageTemplate[] = ["Blank Page", "Project Plan", "Meeting Notes", "PRD", "Research Notes", "Task Plan"];

const starterSpaces = [
  {
    name: "Productivity Hub",
    description: "Daily planning, notes, tasks, and productivity workflows.",
    color: "#8b5cf6",
    pages: 24,
    offsetHours: 0,
  },
  {
    name: "Work Projects",
    description: "Project plans, documentation, and team collaboration.",
    color: "#38bdf8",
    pages: 18,
    offsetHours: 2,
  },
  {
    name: "Personal",
    description: "Personal notes, goals, and life organization.",
    color: "#fb7185",
    pages: 12,
    offsetHours: 24,
  },
  {
    name: "Learning & Growth",
    description: "Courses, books, and research notes.",
    color: "#34d399",
    pages: 15,
    offsetHours: 48,
  },
  {
    name: "Ideas & Research",
    description: "Brainstorming, references, and future ideas.",
    color: "#f59e0b",
    pages: 9,
    offsetHours: 72,
  },
  {
    name: "Archive",
    description: "Old projects and completed work.",
    color: "#94a3b8",
    pages: 32,
    offsetHours: 168,
  },
];

const starterWorkPages = [
  { name: "Q2 Roadmap", template: "Project Plan", type: "Project Plan", updatedBy: "JD", offsetHours: 0, commentsCount: 7, linkedTasksCount: 12 },
  { name: "Sprint Planning", template: "Task Plan", type: "Planning", updatedBy: "AN", offsetHours: 2, commentsCount: 4, linkedTasksCount: 9 },
  { name: "Meeting Notes 12 May", template: "Meeting Notes", type: "Notes", updatedBy: "SK", offsetHours: 24, commentsCount: 3, linkedTasksCount: 2 },
  { name: "Product PRD", template: "PRD", type: "Document", updatedBy: "TL", offsetHours: 48, commentsCount: 11, linkedTasksCount: 6 },
  { name: "Resources & Links", template: "Research Notes", type: "Reference", updatedBy: "AM", offsetHours: 72, commentsCount: 2, linkedTasksCount: 4 },
] satisfies Array<{
  name: string;
  template: PageTemplate;
  type: string;
  updatedBy: string;
  offsetHours: number;
  commentsCount: number;
  linkedTasksCount: number;
}>;

function initialsFor(value: string) {
  const clean = value.trim();
  const source = clean.includes("@") ? clean.split("@")[0] : clean;
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

function cleanName(name: string, fallback = "Untitled") {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, 140);
}

function cleanDescription(description?: string) {
  return (description?.trim() ?? "").slice(0, 260);
}

function cleanColor(color?: string) {
  return color && spaceColors.includes(color) ? color : spaceColors[0];
}

function cleanTemplate(template?: string): PageTemplate {
  return templates.includes(template as PageTemplate) ? (template as PageTemplate) : "Blank Page";
}

function pageTypeFor(template: PageTemplate) {
  if (template === "Project Plan") return "Project Plan";
  if (template === "Meeting Notes") return "Notes";
  if (template === "Task Plan") return "Planning";
  if (template === "Research Notes") return "Reference";
  if (template === "PRD") return "Document";
  return "Document";
}

function pageDescription(name: string, template: PageTemplate) {
  return `${template} for ${name.toLowerCase()}, ready to connect notes, tasks, and decisions.`;
}

function dateOffset(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function toMemberRecord(member: SpaceMember, user?: User | null): SpaceMemberRecord {
  const email = normalizeEmail(member.email);
  const name = user?.name || email;
  return {
    email,
    initials: initialsFor(name),
    color: colorForIdentity(email),
  };
}

function toPageRecord(page: Page): PageRecord {
  return {
    id: page.id,
    spaceId: page.spaceId,
    name: page.name,
    emoji: page.emoji,
    template: cleanTemplate(page.template),
    type: page.type,
    description: page.description,
    favorite: page.favorite === 1,
    archived: page.archived === 1,
    commentsCount: page.commentsCount,
    linkedTasksCount: page.linkedTasksCount,
    updatedBy: page.updatedBy,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

async function toSpaceRecord(space: Space): Promise<SpaceRecord> {
  const [spacePages, members] = await Promise.all([
    db.query.pages.findMany({ where: and(eq(pages.spaceId, space.id), eq(pages.archived, 0)) }),
    db.query.spaceMembers.findMany({ where: eq(spaceMembers.spaceId, space.id) }),
  ]);
  const memberUsers = await Promise.all(
    members.map((member) =>
      member.userId
        ? db.query.users.findFirst({ where: eq(users.id, member.userId) })
        : db.query.users.findFirst({ where: eq(users.email, member.email) }),
    ),
  );

  return {
    id: space.id,
    name: space.name,
    description: space.description,
    color: space.color,
    favorite: space.favorite === 1,
    archived: space.archived === 1,
    pageCount: spacePages.length,
    pageNames: spacePages.map((page) => page.name),
    members: members.map((member, index) => toMemberRecord(member, memberUsers[index] ?? null)),
    lastOpenedAt: space.lastOpenedAt.toISOString(),
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

async function requireSpaceAccess(spaceId: number, user: User) {
  const space = await db.query.spaces.findFirst({ where: eq(spaces.id, spaceId) });
  if (!space) throw new Error("Space not found.");
  if (space.ownerId === user.id) return space;

  const member = await db.query.spaceMembers.findFirst({
    where: and(
      eq(spaceMembers.spaceId, spaceId),
      or(eq(spaceMembers.userId, user.id), eq(spaceMembers.email, user.email)),
    ),
  });

  if (!member) throw new Error("You do not have access to this space.");
  return space;
}

async function createStarterSpaces(user: User) {
  const createdSpaces = await db
    .insert(spaces)
    .values(
      starterSpaces.map((space) => ({
        ownerId: user.id,
        name: space.name,
        description: space.description,
        color: space.color,
        favorite: space.name === "Productivity Hub" ? 1 : 0,
        archived: space.name === "Archive" ? 1 : 0,
        lastOpenedAt: dateOffset(space.offsetHours),
        updatedAt: dateOffset(space.offsetHours),
      })),
    )
    .returning();

  await db.insert(spaceMembers).values(
    createdSpaces.map((space) => ({
      spaceId: space.id,
      userId: user.id,
      email: user.email,
      role: "owner",
      status: "active",
    })),
  );

  const workSpace = createdSpaces.find((space) => space.name === "Work Projects");
  if (workSpace) {
    await db.insert(pages).values(
      [
        ...starterWorkPages.map((page) => ({
        spaceId: workSpace.id,
        ownerId: user.id,
        name: page.name,
        emoji: "doc",
        template: page.template,
        type: page.type,
        description: pageDescription(page.name, page.template),
        commentsCount: page.commentsCount,
        linkedTasksCount: page.linkedTasksCount,
        updatedBy: page.updatedBy,
        updatedAt: dateOffset(page.offsetHours),
        })),
        ...Array.from({ length: Math.max(0, 18 - starterWorkPages.length) }, (_, index) => ({
          spaceId: workSpace.id,
          ownerId: user.id,
          name: `Work Projects Page ${index + 1}`,
          emoji: "doc",
          template: "Blank Page" as PageTemplate,
          type: "Document",
          description: `Workspace document ${index + 1} in Work Projects.`,
          updatedBy: initialsFor(user.name || user.email),
          updatedAt: dateOffset(3 + index),
        })),
      ],
    );
  }

  const fillerSpaces = createdSpaces.filter((space) => space.name !== "Work Projects");
  for (const space of fillerSpaces) {
    const source = starterSpaces.find((item) => item.name === space.name);
    const total = source?.pages ?? 0;
    if (total === 0) continue;
    await db.insert(pages).values(
      Array.from({ length: total }, (_, index) => ({
        spaceId: space.id,
        ownerId: user.id,
        name: `${space.name} Page ${index + 1}`,
        emoji: "doc",
        template: "Blank Page" as PageTemplate,
        type: "Document",
        description: `Workspace document ${index + 1} in ${space.name}.`,
        updatedBy: initialsFor(user.name || user.email),
        updatedAt: dateOffset((source?.offsetHours ?? 0) + index),
      })),
    );
  }
}

async function fillStarterSpacePageCounts(user: User, ownedSpaces: Space[]) {
  for (const space of ownedSpaces) {
    const starter = starterSpaces.find((item) => item.name === space.name);
    if (!starter) continue;

    const currentPages = await db.query.pages.findMany({
      where: and(eq(pages.spaceId, space.id), eq(pages.archived, 0)),
    });
    const excess = currentPages.length - starter.pages;
    if (excess > 0) {
      const generatedPages = currentPages
        .filter((page) => page.name.startsWith(`${space.name} Page `))
        .sort((a, b) => b.id - a.id)
        .slice(0, excess);

      if (generatedPages.length > 0) {
        await db.delete(pages).where(inArray(pages.id, generatedPages.map((page) => page.id)));
      }
    }

    const normalizedPages =
      excess > 0
        ? await db.query.pages.findMany({
            where: and(eq(pages.spaceId, space.id), eq(pages.archived, 0)),
          })
        : currentPages;
    const missing = starter.pages - normalizedPages.length;
    if (missing <= 0) continue;

    await db.insert(pages).values(
      Array.from({ length: missing }, (_, index) => ({
        spaceId: space.id,
        ownerId: user.id,
        name: `${space.name} Page ${normalizedPages.length + index + 1}`,
        emoji: "doc",
        template: "Blank Page" as PageTemplate,
        type: "Document",
        description: `Workspace document ${normalizedPages.length + index + 1} in ${space.name}.`,
        updatedBy: initialsFor(user.name || user.email),
        updatedAt: dateOffset(index + 1),
      })),
    );
  }
}

export async function getSpacesForCurrentUser(): Promise<SpaceRecord[]> {
  const user = await requireWorkspaceUser();
  let ownedSpaces = await db.query.spaces.findMany({
    orderBy: [desc(spaces.updatedAt), desc(spaces.createdAt)],
    where: eq(spaces.ownerId, user.id),
  });

  if (ownedSpaces.length === 0) {
    await createStarterSpaces(user);
    ownedSpaces = await db.query.spaces.findMany({
      orderBy: [desc(spaces.updatedAt), desc(spaces.createdAt)],
      where: eq(spaces.ownerId, user.id),
    });
  }

  await fillStarterSpacePageCounts(user, ownedSpaces);

  return Promise.all(ownedSpaces.map(toSpaceRecord));
}

export async function getPagesForSpaceAction(spaceId: number): Promise<PageRecord[]> {
  const user = await requireWorkspaceUser();
  await requireSpaceAccess(spaceId, user);
  await db.update(spaces).set({ lastOpenedAt: new Date() }).where(eq(spaces.id, spaceId));

  const spacePages = await db.query.pages.findMany({
    orderBy: [desc(pages.updatedAt), desc(pages.createdAt)],
    where: and(eq(pages.spaceId, spaceId), eq(pages.archived, 0)),
  });

  revalidatePath("/spaces");
  return spacePages.map(toPageRecord);
}

export async function createSpaceAction(input: { name: string; description?: string; color?: string }) {
  const user = await requireWorkspaceUser();
  const [space] = await db
    .insert(spaces)
    .values({
      ownerId: user.id,
      name: cleanName(input.name, "New Space"),
      description: cleanDescription(input.description),
      color: cleanColor(input.color),
    })
    .returning();

  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId: user.id,
    email: user.email,
    role: "owner",
    status: "active",
  });

  revalidatePath("/spaces");
  return toSpaceRecord(space);
}

export async function updateSpaceAction(spaceId: number, input: Partial<{ name: string; description: string; color: string; favorite: boolean; archived: boolean }>) {
  const user = await requireWorkspaceUser();
  await requireSpaceAccess(spaceId, user);

  const values: Partial<typeof spaces.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) values.name = cleanName(input.name, "Space");
  if (input.description !== undefined) values.description = cleanDescription(input.description);
  if (input.color !== undefined) values.color = cleanColor(input.color);
  if (input.favorite !== undefined) values.favorite = input.favorite ? 1 : 0;
  if (input.archived !== undefined) values.archived = input.archived ? 1 : 0;

  const [space] = await db.update(spaces).set(values).where(eq(spaces.id, spaceId)).returning();
  revalidatePath("/spaces");
  return toSpaceRecord(space);
}

export async function duplicateSpaceAction(spaceId: number) {
  const user = await requireWorkspaceUser();
  const source = await requireSpaceAccess(spaceId, user);
  const sourcePages = await db.query.pages.findMany({ where: eq(pages.spaceId, source.id) });

  const [space] = await db
    .insert(spaces)
    .values({
      ownerId: user.id,
      name: `${source.name} copy`.slice(0, 140),
      description: source.description,
      color: source.color,
    })
    .returning();

  await db.insert(spaceMembers).values({
    spaceId: space.id,
    userId: user.id,
    email: user.email,
    role: "owner",
    status: "active",
  });

  if (sourcePages.length > 0) {
    await db.insert(pages).values(
      sourcePages.map((page) => ({
        spaceId: space.id,
        ownerId: user.id,
        name: page.name,
        emoji: page.emoji,
        template: page.template,
        type: page.type,
        description: page.description,
        favorite: 0,
        archived: page.archived,
        commentsCount: page.commentsCount,
        linkedTasksCount: page.linkedTasksCount,
        updatedBy: initialsFor(user.name || user.email),
      })),
    );
  }

  revalidatePath("/spaces");
  return toSpaceRecord(space);
}

export async function deleteSpaceAction(spaceId: number) {
  const user = await requireWorkspaceUser();
  await requireSpaceAccess(spaceId, user);
  await db.delete(spaces).where(and(eq(spaces.id, spaceId), eq(spaces.ownerId, user.id)));
  revalidatePath("/spaces");
  return spaceId;
}

export async function createPageAction(input: { spaceId: number; name: string; emoji?: string; template?: string }) {
  const user = await requireWorkspaceUser();
  await requireSpaceAccess(input.spaceId, user);
  const template = cleanTemplate(input.template);
  const name = cleanName(input.name, "Untitled Page");

  const [page] = await db
    .insert(pages)
    .values({
      spaceId: input.spaceId,
      ownerId: user.id,
      name,
      emoji: (input.emoji?.trim() || "doc").slice(0, 12),
      template,
      type: pageTypeFor(template),
      description: pageDescription(name, template),
      updatedBy: initialsFor(user.name || user.email),
    })
    .returning();

  await db.update(spaces).set({ updatedAt: new Date(), lastOpenedAt: new Date() }).where(eq(spaces.id, input.spaceId));
  revalidatePath("/spaces");
  return toPageRecord(page);
}

export async function updatePageAction(pageId: number, input: Partial<{ name: string; favorite: boolean; archived: boolean }>) {
  const user = await requireWorkspaceUser();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) throw new Error("Page not found.");
  await requireSpaceAccess(page.spaceId, user);

  const values: Partial<typeof pages.$inferInsert> = { updatedAt: new Date(), updatedBy: initialsFor(user.name || user.email) };
  if (input.name !== undefined) values.name = cleanName(input.name, "Page");
  if (input.favorite !== undefined) values.favorite = input.favorite ? 1 : 0;
  if (input.archived !== undefined) values.archived = input.archived ? 1 : 0;

  const [updated] = await db.update(pages).set(values).where(eq(pages.id, pageId)).returning();
  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, updated.spaceId));
  revalidatePath("/spaces");
  return toPageRecord(updated);
}

export async function duplicatePageAction(pageId: number) {
  const user = await requireWorkspaceUser();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) throw new Error("Page not found.");
  await requireSpaceAccess(page.spaceId, user);

  const [copy] = await db
    .insert(pages)
    .values({
      spaceId: page.spaceId,
      ownerId: user.id,
      name: `${page.name} copy`.slice(0, 140),
      emoji: page.emoji,
      template: page.template,
      type: page.type,
      description: page.description,
      commentsCount: page.commentsCount,
      linkedTasksCount: page.linkedTasksCount,
      updatedBy: initialsFor(user.name || user.email),
    })
    .returning();

  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, page.spaceId));
  revalidatePath("/spaces");
  return toPageRecord(copy);
}

export async function deletePageAction(pageId: number) {
  const user = await requireWorkspaceUser();
  const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) });
  if (!page) throw new Error("Page not found.");
  await requireSpaceAccess(page.spaceId, user);

  await db.delete(pages).where(eq(pages.id, pageId));
  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, page.spaceId));
  revalidatePath("/spaces");
  return pageId;
}
