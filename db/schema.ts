import {
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserAiSettings = {
  model: string;
  behavior: string;
  tone: string;
  features: {
    refine: boolean;
    assistant: boolean;
    templateBuilder: boolean;
    summaries: boolean;
  };
};

export type UserNotificationSettings = {
  email: boolean;
  desktop: boolean;
  reminders: boolean;
  digest: boolean;
};

export type UserPrivacySettings = {
  twoFactorReminder: boolean;
  privateProfile: boolean;
  dataSharing: boolean;
};

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").notNull().default("system"),
  defaultCalendarView: text("default_calendar_view").notNull().default("month"),
  defaultTaskPriority: text("default_task_priority").notNull().default("Medium"),
  autoSave: integer("auto_save").notNull().default(1),
  aiSettings: jsonb("ai_settings").$type<UserAiSettings>().notNull(),
  notificationSettings: jsonb("notification_settings")
    .$type<UserNotificationSettings>()
    .notNull(),
  privacySettings: jsonb("privacy_settings").$type<UserPrivacySettings>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userSettingsUserUnique: uniqueIndex("user_settings_user_unique").on(table.userId),
}));

export const userCategories = pgTable("user_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull().default("Tag"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: serial("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  categoryKey: text("category_key"),
  scheduledDate: date("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoardMembers = pgTable(
  "kanban_board_members",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    boardEmailUnique: uniqueIndex("kanban_board_members_board_email_unique").on(
      table.boardId,
      table.email,
    ),
  }),
);

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  columnId: integer("column_id")
    .notNull()
    .references(() => kanbanColumns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  dueDate: date("due_date"),
  priority: text("priority").notNull().default("Medium"),
  labelIds: text("label_ids").notNull().default("work"),
  syncCalendar: integer("sync_calendar").notNull().default(0),
  linkNotes: integer("link_notes").notNull().default(0),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WhiteboardScene = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export type GeneratedAppField = {
  label: string;
  type: "text" | "number" | "date" | "select" | "checkbox" | "textarea";
  placeholder?: string;
  options?: string[];
};

export type GeneratedAppComponent = {
  type:
    | "stats"
    | "list"
    | "table"
    | "form"
    | "progress"
    | "checklist"
    | "buttons"
    | "tags"
    | "chart";
  title?: string;
  description?: string;
  fields?: GeneratedAppField[];
  items?: Array<Record<string, unknown>>;
  actions?: string[];
};

export type GeneratedAppSection = {
  title: string;
  description?: string;
  components: GeneratedAppComponent[];
};

export type GeneratedAppTemplate = {
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: "single-page";
  sections: GeneratedAppSection[];
  components: GeneratedAppComponent[];
  fields: GeneratedAppField[];
  actions: string[];
  sampleData: Array<Record<string, unknown>>;
};

export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  scene: jsonb("scene").$type<WhiteboardScene>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedApps = pgTable("generated_apps", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  appName: text("app_name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Sparkles"),
  color: text("color").notNull().default("#8b5cf6"),
  layout: text("layout").notNull().default("single-page"),
  template: jsonb("template").$type<GeneratedAppTemplate>().notNull(),
  addedToSidebar: integer("added_to_sidebar").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spaces = pgTable("spaces", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull(),
  favorite: integer("favorite").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  lastOpenedAt: timestamp("last_opened_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spaceMembers = pgTable(
  "space_members",
  {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    spaceEmailUnique: uniqueIndex("space_members_space_email_unique").on(
      table.spaceId,
      table.email,
    ),
  }),
);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id")
    .notNull()
    .references(() => spaces.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("doc"),
  template: text("template").notNull().default("Blank Page"),
  type: text("type").notNull().default("Document"),
  description: text("description").notNull().default(""),
  favorite: integer("favorite").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  linkedTasksCount: integer("linked_tasks_count").notNull().default(0),
  updatedBy: text("updated_by").notNull().default("You"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type UserCategory = typeof userCategories.$inferSelect;
export type NewUserCategory = typeof userCategories.$inferInsert;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type NewCalendarItem = typeof calendarItems.$inferInsert;
export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;
export type KanbanBoardMember = typeof kanbanBoardMembers.$inferSelect;
export type NewKanbanBoardMember = typeof kanbanBoardMembers.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type NewKanbanTask = typeof kanbanTasks.$inferInsert;
export type Whiteboard = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;
export type GeneratedApp = typeof generatedApps.$inferSelect;
export type NewGeneratedApp = typeof generatedApps.$inferInsert;
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type SpaceMember = typeof spaceMembers.$inferSelect;
export type NewSpaceMember = typeof spaceMembers.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
