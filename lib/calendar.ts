export const taskCategories = [
  {
    key: "work",
    label: "Work",
    chipClassName: "border-sky-200 bg-sky-100 text-sky-800",
    dotClassName: "bg-sky-500",
  },
  {
    key: "personal",
    label: "Personal",
    chipClassName: "border-rose-200 bg-rose-100 text-rose-800",
    dotClassName: "bg-rose-500",
  },
  {
    key: "focus",
    label: "Focus",
    chipClassName: "border-emerald-200 bg-emerald-100 text-emerald-800",
    dotClassName: "bg-emerald-500",
  },
  {
    key: "errand",
    label: "Errand",
    chipClassName: "border-amber-200 bg-amber-100 text-amber-800",
    dotClassName: "bg-amber-500",
  },
] as const;

export type CalendarItemKind = "task" | "reminder";
export type TaskCategoryKey = string;

export type CalendarCategory = {
  key: string;
  scope: "tasks" | "reminders";
  label: string;
  color: string;
  icon: string;
  chipClassName: string;
  dotClassName: string;
};

export type CalendarItemRecord = {
  id: number;
  kind: CalendarItemKind;
  title: string;
  notes: string | null;
  categoryKey: TaskCategoryKey | null;
  scheduledDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function isTaskCategoryKey(value: string): value is TaskCategoryKey {
  return Boolean(value.trim());
}

export function toCalendarItemRecord(item: {
  id: number;
  kind: string;
  title: string;
  notes: string | null;
  categoryKey: string | null;
  scheduledDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CalendarItemRecord {
  return {
    ...item,
    kind: item.kind === "reminder" ? "reminder" : "task",
    categoryKey: item.categoryKey && isTaskCategoryKey(item.categoryKey) ? item.categoryKey : null,
  };
}

export function calendarCategoryTone(color: string) {
  const normalized = color.toLowerCase();
  const tone =
    normalized === "#fb7185"
      ? "border-rose-200 bg-rose-100 text-rose-800"
      : normalized === "#34d399"
        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
        : normalized === "#f59e0b" || normalized === "#f97316"
          ? "border-amber-200 bg-amber-100 text-amber-800"
          : normalized === "#a78bfa" || normalized === "#8b5cf6"
            ? "border-violet-200 bg-violet-100 text-violet-800"
            : normalized === "#2dd4bf"
              ? "border-teal-200 bg-teal-100 text-teal-800"
              : "border-sky-200 bg-sky-100 text-sky-800";

  const dot =
    normalized === "#fb7185"
      ? "bg-rose-500"
      : normalized === "#34d399"
        ? "bg-emerald-500"
        : normalized === "#f59e0b" || normalized === "#f97316"
          ? "bg-amber-500"
          : normalized === "#a78bfa" || normalized === "#8b5cf6"
            ? "bg-violet-500"
            : normalized === "#2dd4bf"
              ? "bg-teal-500"
              : "bg-sky-500";

  return { chipClassName: tone, dotClassName: dot };
}
