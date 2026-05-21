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
export type TaskCategoryKey = (typeof taskCategories)[number]["key"];

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
  return taskCategories.some((category) => category.key === value);
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
    categoryKey:
      item.categoryKey && isTaskCategoryKey(item.categoryKey)
        ? item.categoryKey
        : null,
  };
}
