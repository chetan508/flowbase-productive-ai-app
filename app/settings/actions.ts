"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, userCategories, userSettings, type UserAiSettings } from "@/db";
import {
  assertWithinFreeLimit,
  getCurrentPlanTier,
  getUsageCounts,
} from "@/lib/entitlements";
import {
  cleanCategoryColor,
  cleanCategoryIcon,
  cleanCategoryName,
  cleanCategoryScope,
  ensureUserCategories,
  ensureUserSettings,
  normalizeAiSettings,
  normalizeNotificationSettings,
  normalizePrivacySettings,
  toCategoryRecord,
  toSettingsRecord,
  type CategoryRecord,
  type CategoryScope,
  type SettingsRecord,
} from "@/lib/settings";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export type SettingsPageData = {
  settings: SettingsRecord;
  categories: CategoryRecord[];
  usage: Awaited<ReturnType<typeof getUsageCounts>>;
  planTier: "free" | "pro";
};

export type SettingsUpdateInput = Partial<{
  displayName: string;
  avatarUrl: string;
  theme: string;
  defaultCalendarView: string;
  defaultTaskPriority: string;
  autoSave: boolean;
  aiSettings: Partial<UserAiSettings>;
  notificationSettings: Record<string, boolean>;
  privacySettings: Record<string, boolean>;
}>;

function cleanText(value: string | undefined, fallback = "") {
  return (value ?? fallback).trim().slice(0, 180);
}

function cleanUrl(value: string | undefined) {
  const url = (value ?? "").trim().slice(0, 400);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  throw new Error("Avatar URL must start with http:// or https://.");
}

function cleanTheme(value: string | undefined) {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function cleanCalendarView(value: string | undefined) {
  return value === "week" ? "week" : "month";
}

function cleanPriority(value: string | undefined) {
  return value === "Low" || value === "High" ? value : "Medium";
}

async function currentSettingsRecord() {
  const user = await requireWorkspaceUser();
  const settings = await ensureUserSettings(user);
  const categories = await ensureUserCategories(user.id);
  const [usage, planTier] = await Promise.all([getUsageCounts(user), getCurrentPlanTier()]);

  return {
    settings: toSettingsRecord(settings, user),
    categories: categories.map(toCategoryRecord),
    usage,
    planTier,
  };
}

export async function getSettingsPageDataAction(): Promise<SettingsPageData> {
  return currentSettingsRecord();
}

export async function updateSettingsAction(input: SettingsUpdateInput): Promise<SettingsRecord> {
  const user = await requireWorkspaceUser();
  const existing = await ensureUserSettings(user);
  const values: Partial<typeof userSettings.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.displayName !== undefined) {
    values.displayName = cleanText(input.displayName, user.name ?? "");
  }
  if (input.avatarUrl !== undefined) {
    values.avatarUrl = cleanUrl(input.avatarUrl);
  }
  if (input.theme !== undefined) {
    values.theme = cleanTheme(input.theme);
  }
  if (input.defaultCalendarView !== undefined) {
    values.defaultCalendarView = cleanCalendarView(input.defaultCalendarView);
  }
  if (input.defaultTaskPriority !== undefined) {
    values.defaultTaskPriority = cleanPriority(input.defaultTaskPriority);
  }
  if (input.autoSave !== undefined) {
    values.autoSave = input.autoSave ? 1 : 0;
  }
  if (input.aiSettings !== undefined) {
    values.aiSettings = normalizeAiSettings(input.aiSettings);
  }
  if (input.notificationSettings !== undefined) {
    values.notificationSettings = normalizeNotificationSettings(input.notificationSettings);
  }
  if (input.privacySettings !== undefined) {
    values.privacySettings = normalizePrivacySettings(input.privacySettings);
  }

  const [updated] = await db
    .update(userSettings)
    .set(values)
    .where(eq(userSettings.id, existing.id))
    .returning();

  revalidatePath("/settings");
  return toSettingsRecord(updated, user);
}

export async function createCategoryAction(input: {
  scope: CategoryScope | string;
  name: string;
  color: string;
  icon: string;
}): Promise<CategoryRecord[]> {
  const user = await requireWorkspaceUser();
  await assertWithinFreeLimit(user, "customCategories", await getCurrentPlanTier());

  const scope = cleanCategoryScope(input.scope);
  const current = await db.query.userCategories.findMany({
    where: and(eq(userCategories.userId, user.id), eq(userCategories.scope, scope)),
  });

  await db.insert(userCategories).values({
    userId: user.id,
    scope,
    name: cleanCategoryName(input.name),
    color: cleanCategoryColor(input.color),
    icon: cleanCategoryIcon(input.icon),
    position: current.length,
  });

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return getCategoryRecords(user.id);
}

export async function updateCategoryAction(
  categoryId: number,
  input: Partial<{ name: string; color: string; icon: string; scope: string }>,
): Promise<CategoryRecord[]> {
  const user = await requireWorkspaceUser();
  const existing = await db.query.userCategories.findFirst({
    where: and(eq(userCategories.id, categoryId), eq(userCategories.userId, user.id)),
  });
  if (!existing) {
    throw new Error("Category not found.");
  }

  const values: Partial<typeof userCategories.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) values.name = cleanCategoryName(input.name);
  if (input.color !== undefined) values.color = cleanCategoryColor(input.color);
  if (input.icon !== undefined) values.icon = cleanCategoryIcon(input.icon);
  if (input.scope !== undefined) values.scope = cleanCategoryScope(input.scope);

  await db
    .update(userCategories)
    .set(values)
    .where(and(eq(userCategories.id, categoryId), eq(userCategories.userId, user.id)));

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return getCategoryRecords(user.id);
}

export async function deleteCategoryAction(categoryId: number): Promise<CategoryRecord[]> {
  const user = await requireWorkspaceUser();
  const [deleted] = await db
    .delete(userCategories)
    .where(and(eq(userCategories.id, categoryId), eq(userCategories.userId, user.id)))
    .returning({ id: userCategories.id });

  if (!deleted) {
    throw new Error("Category not found.");
  }

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return getCategoryRecords(user.id);
}

export async function exportUserDataAction() {
  const user = await requireWorkspaceUser();
  const planTier = await getCurrentPlanTier();
  if (planTier !== "pro") {
    throw new Error("Data export is available on the Pro plan.");
  }

  const data = await currentSettingsRecord();
  return {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email, name: user.name },
    settings: data.settings,
    categories: data.categories,
    usage: data.usage,
  };
}

async function getCategoryRecords(userId: number) {
  const categories = await db.query.userCategories.findMany({
    orderBy: [asc(userCategories.scope), asc(userCategories.position), asc(userCategories.createdAt)],
    where: eq(userCategories.userId, userId),
  });
  return categories.map(toCategoryRecord);
}
