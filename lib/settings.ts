import { asc, eq } from "drizzle-orm";

import {
  db,
  userCategories,
  userSettings,
  type User,
  type UserAiSettings,
  type UserCategory,
  type UserNotificationSettings,
  type UserPrivacySettings,
  type UserSettings,
} from "@/db";
import {
  categoryIconNames,
  categoryScopes,
  type CalendarViewPreference,
  type CategoryScope,
  type TaskPriorityPreference,
  type ThemePreference,
} from "@/lib/settings-options";

export type {
  CalendarViewPreference,
  CategoryScope,
  TaskPriorityPreference,
  ThemePreference,
} from "@/lib/settings-options";

export type SettingsRecord = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string;
  theme: ThemePreference;
  defaultCalendarView: CalendarViewPreference;
  defaultTaskPriority: TaskPriorityPreference;
  autoSave: boolean;
  aiSettings: UserAiSettings;
  notificationSettings: UserNotificationSettings;
  privacySettings: UserPrivacySettings;
};

export type CategoryRecord = {
  id: number;
  scope: CategoryScope;
  name: string;
  color: string;
  icon: string;
  position: number;
};

const colorPattern = /^#[0-9a-f]{6}$/i;

export const defaultAiSettings: UserAiSettings = {
  model: "gemini-2.0-flash-lite",
  behavior: "balanced",
  tone: "warm",
  features: {
    refine: true,
    assistant: true,
    templateBuilder: true,
    summaries: true,
  },
};

export const defaultNotificationSettings: UserNotificationSettings = {
  email: true,
  desktop: true,
  reminders: true,
  digest: false,
};

export const defaultPrivacySettings: UserPrivacySettings = {
  twoFactorReminder: true,
  privateProfile: false,
  dataSharing: false,
};

export const starterCategories: Array<Omit<CategoryRecord, "id">> = [
  { scope: "calendar", name: "Planning", color: "#38bdf8", icon: "CalendarDays", position: 0 },
  { scope: "tasks", name: "Work", color: "#38bdf8", icon: "Briefcase", position: 0 },
  { scope: "tasks", name: "Personal", color: "#fb7185", icon: "Heart", position: 1 },
  { scope: "tasks", name: "Focus", color: "#34d399", icon: "Lightbulb", position: 2 },
  { scope: "tasks", name: "Errand", color: "#f59e0b", icon: "Home", position: 3 },
  { scope: "notes", name: "Ideas", color: "#a78bfa", icon: "Sparkles", position: 0 },
  { scope: "reminders", name: "Reminder", color: "#8b5cf6", icon: "Bell", position: 0 },
  { scope: "reminders", name: "Follow-up", color: "#f97316", icon: "Flag", position: 1 },
];

export function cleanCategoryScope(value: string): CategoryScope {
  return categoryScopes.includes(value as CategoryScope) ? (value as CategoryScope) : "tasks";
}

export function cleanCategoryColor(value: string) {
  return colorPattern.test(value) ? value : "#38bdf8";
}

export function cleanCategoryIcon(value: string) {
  return categoryIconNames.includes(value as (typeof categoryIconNames)[number]) ? value : "Tag";
}

export function cleanCategoryName(value: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 42);
  if (!name) {
    throw new Error("Category name is required.");
  }
  return name;
}

function cleanTheme(value: string): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function cleanCalendarView(value: string): CalendarViewPreference {
  return value === "week" ? "week" : "month";
}

function cleanPriority(value: string): TaskPriorityPreference {
  return value === "Low" || value === "High" ? value : "Medium";
}

export function normalizeAiSettings(value: Partial<UserAiSettings> | null | undefined): UserAiSettings {
  return {
    model: (value?.model || defaultAiSettings.model).trim().slice(0, 80),
    behavior: (value?.behavior || defaultAiSettings.behavior).trim().slice(0, 40),
    tone: (value?.tone || defaultAiSettings.tone).trim().slice(0, 40),
    features: {
      refine: value?.features?.refine ?? defaultAiSettings.features.refine,
      assistant: value?.features?.assistant ?? defaultAiSettings.features.assistant,
      templateBuilder:
        value?.features?.templateBuilder ?? defaultAiSettings.features.templateBuilder,
      summaries: value?.features?.summaries ?? defaultAiSettings.features.summaries,
    },
  };
}

export function normalizeNotificationSettings(
  value: Partial<UserNotificationSettings> | null | undefined,
): UserNotificationSettings {
  return {
    email: value?.email ?? defaultNotificationSettings.email,
    desktop: value?.desktop ?? defaultNotificationSettings.desktop,
    reminders: value?.reminders ?? defaultNotificationSettings.reminders,
    digest: value?.digest ?? defaultNotificationSettings.digest,
  };
}

export function normalizePrivacySettings(
  value: Partial<UserPrivacySettings> | null | undefined,
): UserPrivacySettings {
  return {
    twoFactorReminder: value?.twoFactorReminder ?? defaultPrivacySettings.twoFactorReminder,
    privateProfile: value?.privateProfile ?? defaultPrivacySettings.privateProfile,
    dataSharing: value?.dataSharing ?? defaultPrivacySettings.dataSharing,
  };
}

export function toSettingsRecord(settings: UserSettings, user: User): SettingsRecord {
  return {
    id: settings.id,
    email: user.email,
    displayName: settings.displayName || user.name || user.email.split("@")[0] || "Flowbase user",
    avatarUrl: settings.avatarUrl || "",
    theme: cleanTheme(settings.theme),
    defaultCalendarView: cleanCalendarView(settings.defaultCalendarView),
    defaultTaskPriority: cleanPriority(settings.defaultTaskPriority),
    autoSave: settings.autoSave === 1,
    aiSettings: normalizeAiSettings(settings.aiSettings),
    notificationSettings: normalizeNotificationSettings(settings.notificationSettings),
    privacySettings: normalizePrivacySettings(settings.privacySettings),
  };
}

export function toCategoryRecord(category: UserCategory): CategoryRecord {
  return {
    id: category.id,
    scope: cleanCategoryScope(category.scope),
    name: category.name,
    color: cleanCategoryColor(category.color),
    icon: cleanCategoryIcon(category.icon),
    position: category.position,
  };
}

export async function ensureUserSettings(user: User) {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, user.id),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(userSettings)
    .values({
      userId: user.id,
      displayName: user.name,
      avatarUrl: "",
      aiSettings: defaultAiSettings,
      notificationSettings: defaultNotificationSettings,
      privacySettings: defaultPrivacySettings,
    })
    .returning();

  return created;
}

export async function ensureUserCategories(userId: number) {
  const existing = await db.query.userCategories.findMany({
    where: eq(userCategories.userId, userId),
  });
  const existingKeys = new Set(existing.map((category) => `${category.scope}:${category.name}`));
  const missingCategories = starterCategories.filter(
    (category) => !existingKeys.has(`${category.scope}:${category.name}`),
  );

  if (missingCategories.length > 0) {
    await db.insert(userCategories).values(
      missingCategories.map((category) => ({
        userId,
        scope: category.scope,
        name: category.name,
        color: category.color,
        icon: cleanCategoryIcon(category.icon),
        position: category.position,
      })),
    );
  }

  return db.query.userCategories.findMany({
    orderBy: [asc(userCategories.scope), asc(userCategories.position), asc(userCategories.createdAt)],
    where: eq(userCategories.userId, userId),
  });
}
