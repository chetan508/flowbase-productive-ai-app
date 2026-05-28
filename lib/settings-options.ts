export type CategoryScope = "calendar" | "tasks" | "notes" | "reminders";
export type ThemePreference = "system" | "light" | "dark";
export type CalendarViewPreference = "month" | "week";
export type TaskPriorityPreference = "Low" | "Medium" | "High";

export const categoryScopes: CategoryScope[] = ["calendar", "tasks", "notes", "reminders"];

export const categoryIconNames = [
  "Bell",
  "Briefcase",
  "CalendarDays",
  "CheckCircle2",
  "Clock",
  "Flag",
  "Heart",
  "Home",
  "Lightbulb",
  "NotebookPen",
  "Sparkles",
  "Star",
  "Tag",
] as const;
