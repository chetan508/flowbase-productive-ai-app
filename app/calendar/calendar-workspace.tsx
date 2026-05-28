"use client";

import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition, type DragEvent, type FormEvent } from "react";

import {
  createCalendarItemAction,
  deleteCalendarItemAction,
  updateCalendarItemAction,
} from "@/app/calendar/actions";
import {
  type CalendarCategory,
  type CalendarItemKind,
  type CalendarItemRecord,
  type TaskCategoryKey,
} from "@/lib/calendar";

type CalendarView = "month" | "week";
type ComposerState = {
  item: CalendarItemRecord | null;
  kind: CalendarItemKind;
  scheduledDate: string;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const reminderTone = "border-violet-200 bg-violet-100 text-violet-800";
const fallbackCategory: CalendarCategory = {
  key: "fallback",
  scope: "tasks",
  label: "General",
  color: "#38bdf8",
  icon: "Tag",
  chipClassName: "border-sky-200 bg-sky-100 text-sky-800",
  dotClassName: "bg-sky-500",
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function monthDays(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function weekRange(anchor: Date) {
  const gridStart = startOfWeek(anchor);

  return Array.from({ length: 7 }, (_, index) => addDays(gridStart, index));
}

function categoryFor(categories: CalendarCategory[], key: TaskCategoryKey | null) {
  return categories.find((category) => category.key === key) ?? categories[0] ?? fallbackCategory;
}

function sortItems(items: CalendarItemRecord[]) {
  return [...items].sort((left, right) => {
    const leftDate = left.scheduledDate ?? "9999-12-31";
    const rightDate = right.scheduledDate ?? "9999-12-31";

    return leftDate.localeCompare(rightDate) || left.createdAt.getTime() - right.createdAt.getTime();
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Calendar update failed.";
}

export function CalendarWorkspace({
  initialCategories,
  initialItems,
}: {
  initialCategories: CalendarCategory[];
  initialItems: CalendarItemRecord[];
}) {
  const today = useMemo(() => new Date(), []);
  const [items, setItems] = useState(() => sortItems(initialItems));
  const [categories] = useState(initialCategories);
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const [anchor, setAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleDays = useMemo(
    () => (view === "month" ? monthDays(anchor) : weekRange(dateFromKey(selectedDate))),
    [anchor, selectedDate, view],
  );
  const visibleTitle =
    view === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${visibleDays[0].toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${visibleDays[6].toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
  const drafts = items.filter((item) => item.kind === "task" && !item.scheduledDate);
  const taskCategories = categories.filter((category) => category.scope === "tasks");
  const reminderCategories = categories.filter((category) => category.scope === "reminders");
  const defaultTaskCategory = taskCategories[0]?.key ?? categories[0]?.key ?? "";
  const defaultReminderCategory = reminderCategories[0]?.key ?? defaultTaskCategory;
  const scheduledByDate = items.reduce<Record<string, CalendarItemRecord[]>>((dates, item) => {
    if (item.scheduledDate) {
      dates[item.scheduledDate] = [...(dates[item.scheduledDate] ?? []), item];
    }

    return dates;
  }, {});

  function movePeriod(direction: -1 | 1) {
    if (view === "month") {
      const nextAnchor = new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
      setAnchor(nextAnchor);
      setSelectedDate(dateKey(nextAnchor));
      return;
    }

    const nextWeekDate = addDays(dateFromKey(selectedDate), direction * 7);
    setSelectedDate(dateKey(nextWeekDate));
    setAnchor(new Date(nextWeekDate.getFullYear(), nextWeekDate.getMonth(), 1));
  }

  function selectDate(day: Date) {
    const nextDate = dateKey(day);
    setSelectedDate(nextDate);
    setAnchor(new Date(day.getFullYear(), day.getMonth(), 1));
  }

  function storeItem(nextItem: CalendarItemRecord) {
    setItems((currentItems) =>
      sortItems([
        ...currentItems.filter((item) => item.id !== nextItem.id),
        nextItem,
      ]),
    );
  }

  function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const draft = await createCalendarItemAction({
          kind: "task",
          title: String(formData.get("draftTitle") ?? ""),
          notes: String(formData.get("draftNotes") ?? ""),
          categoryKey: String(formData.get("draftCategory") ?? defaultTaskCategory) as TaskCategoryKey,
          scheduledDate: null,
        });

        storeItem(draft);
        form.reset();
        setFeedback("Draft task saved.");
      } catch (error) {
        setFeedback(errorMessage(error));
      }
    });
  }

  function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const kind: CalendarItemKind =
      String(formData.get("kind")) === "reminder" ? "reminder" : "task";
    const input = {
      kind,
      title: String(formData.get("title") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      categoryKey:
        kind === "task"
          ? (String(formData.get("categoryKey") ?? defaultTaskCategory) as TaskCategoryKey)
          : (String(formData.get("categoryKey") ?? defaultReminderCategory) as TaskCategoryKey),
      scheduledDate: String(formData.get("scheduledDate") ?? ""),
    };

    startTransition(async () => {
      try {
        const savedItem = composer?.item
          ? await updateCalendarItemAction(composer.item.id, input)
          : await createCalendarItemAction(input);

        storeItem(savedItem);
        setComposer(null);
        setFeedback(composer?.item ? "Calendar item updated." : "Calendar item scheduled.");
      } catch (error) {
        setFeedback(errorMessage(error));
      }
    });
  }

  function scheduleItem(id: number, scheduledDate: string) {
    startTransition(async () => {
      try {
        const nextItem = await updateCalendarItemAction(id, { scheduledDate });
        storeItem(nextItem);
        setFeedback("Task rescheduled.");
      } catch (error) {
        setFeedback(errorMessage(error));
      }
    });
  }

  function deleteItem(id: number) {
    startTransition(async () => {
      try {
        await deleteCalendarItemAction(id);
        setItems((currentItems) => currentItems.filter((item) => item.id !== id));
        setFeedback("Calendar item deleted.");
      } catch (error) {
        setFeedback(errorMessage(error));
      }
    });
  }

  function dropOnDate(event: DragEvent<HTMLElement>, scheduledDate: string) {
    event.preventDefault();
    setDropTarget(null);
    const itemId = Number(event.dataTransfer.getData("text/calendar-item-id"));

    if (Number.isFinite(itemId)) {
      scheduleItem(itemId, scheduledDate);
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Calendar planning</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Schedule the next move</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex h-10 items-center rounded-lg border border-white bg-white/80 p-1 shadow-sm shadow-slate-200/60">
            {(["month", "week"] as const).map((calendarView) => (
              <button
                aria-pressed={view === calendarView}
                className={`h-8 rounded-md px-3 text-sm font-medium capitalize transition ${
                  view === calendarView
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-cyan-50 hover:text-slate-950"
                }`}
                key={calendarView}
                onClick={() => setView(calendarView)}
                type="button"
              >
                {calendarView}
              </button>
            ))}
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            onClick={() => setComposer({ item: null, kind: "task", scheduledDate: selectedDate })}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add item
          </button>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 py-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-200/60 sm:p-4">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-emerald-500" />
              <h2 className="truncate text-lg font-semibold text-slate-950">{visibleTitle}</h2>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                aria-label={`Previous ${view}`}
                className="grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
                onClick={() => movePeriod(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
                onClick={() => {
                  setSelectedDate(dateKey(today));
                  setAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
                type="button"
              >
                Today
              </button>
              <button
                aria-label={`Next ${view}`}
                className="grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
                onClick={() => movePeriod(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-slate-500 sm:gap-2">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={`mt-2 grid min-w-0 grid-cols-7 gap-1 sm:gap-2 ${view === "week" ? "min-h-[520px]" : ""}`}>
            {visibleDays.map((day) => {
              const key = dateKey(day);
              const dayItems = scheduledByDate[key] ?? [];
              const isSelected = selectedDate === key;
              const isToday = dateKey(today) === key;
              const isOutsideMonth = view === "month" && day.getMonth() !== anchor.getMonth();
              const visibleItems = dayItems.slice(0, view === "month" ? 3 : 5);

              return (
                <article
                  className={`group min-w-0 rounded-lg border p-1.5 transition sm:p-2 ${
                    view === "month" ? "min-h-32" : "min-h-[460px]"
                  } ${
                    dropTarget === key
                      ? "border-cyan-400 bg-cyan-50"
                      : isSelected
                        ? "border-slate-400 bg-white"
                        : "border-slate-100 bg-[color:var(--soft-panel)]"
                  } ${isOutsideMonth ? "opacity-60" : ""}`}
                  data-testid={`calendar-date-${key}`}
                  key={key}
                  onDragEnter={() => setDropTarget(key)}
                  onDragLeave={() => setDropTarget((current) => (current === key ? null : current))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnDate(event, key)}
                >
                  <button
                    aria-label={`Select ${key}`}
                    className="flex w-full min-w-0 items-center justify-between gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    onClick={() => selectDate(day)}
                    type="button"
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold ${
                        isToday
                          ? "bg-slate-950 text-white"
                          : isSelected
                            ? "bg-cyan-100 text-cyan-900"
                            : "text-slate-700"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="truncate text-[10px] font-medium text-slate-400">
                        {dayItems.length}
                      </span>
                    )}
                  </button>

                  <div className="mt-1.5 space-y-1">
                    {visibleItems.map((item) => (
                      <CalendarItemChip
                        categories={categories}
                        item={item}
                        key={item.id}
                        onDelete={deleteItem}
                        onEdit={(selectedItem) =>
                          setComposer({
                            item: selectedItem,
                            kind: selectedItem.kind,
                            scheduledDate: selectedItem.scheduledDate ?? key,
                          })
                        }
                      />
                    ))}
                    {dayItems.length > visibleItems.length && (
                      <p className="truncate px-1 text-[11px] font-medium text-slate-500">
                        +{dayItems.length - visibleItems.length} more
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-600">Unscheduled</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">Draft Task Panel</h2>
            </div>
            <ClipboardPlus aria-hidden="true" className="size-4 text-amber-500" />
          </div>

          <form className="mt-4 space-y-2" onSubmit={createDraft}>
            <label className="block text-xs font-medium text-slate-600">
              Draft title
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                name="draftTitle"
                placeholder="Outline launch checklist"
                required
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-xs font-medium text-slate-600">
                Category
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={defaultTaskCategory}
                  name="draftCategory"
                >
                  {taskCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Notes
                <input
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  name="draftNotes"
                  placeholder="Optional"
                />
              </label>
            </div>
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              <Plus aria-hidden="true" className="size-4" />
              Save draft
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Ready to schedule</p>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                {drafts.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {drafts.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 bg-[color:var(--soft-panel)] p-3 text-sm text-slate-500">
                  Save a draft here, then drag it onto a date or schedule it from its actions.
                </div>
              )}
              {drafts.map((draft) => {
                const category = categoryFor(taskCategories, draft.categoryKey);

                return (
                  <article
                    className="rounded-md border border-slate-100 bg-[color:var(--soft-panel)] p-3"
                    draggable
                    key={draft.id}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/calendar-item-id", String(draft.id));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <GripVertical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{draft.title}</p>
                        <span className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${category.chipClassName}`}>
                          {category.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <DraftAction
                        label="Schedule"
                        onClick={() =>
                          setComposer({
                            item: draft,
                            kind: "task",
                            scheduledDate: selectedDate,
                          })
                        }
                      />
                      <DraftAction
                        icon={<Pencil aria-hidden="true" className="size-3" />}
                        label="Edit"
                        onClick={() =>
                          setComposer({
                            item: draft,
                            kind: "task",
                            scheduledDate: "",
                          })
                        }
                      />
                      <DraftAction
                        icon={<Trash2 aria-hidden="true" className="size-3" />}
                        label="Delete"
                        onClick={() => deleteItem(draft.id)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {feedback && (
        <p
          aria-live="polite"
          className="fixed bottom-4 right-4 z-20 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg"
        >
          {feedback}
        </p>
      )}

      {composer && (
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
          <form
            aria-label={composer.item ? "Edit calendar item" : "Create calendar item"}
            className="w-full max-w-lg rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5"
            onSubmit={submitComposer}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-600">
                  {composer.item ? "Update item" : "Quick add"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  {composer.item ? "Edit calendar item" : "Schedule a task or reminder"}
                </h2>
              </div>
              <button
                aria-label="Close dialog"
                className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setComposer(null)}
                type="button"
              >
                x
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Title
                <input
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={composer.item?.title}
                  name="title"
                  placeholder="Review sprint notes"
                  required
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Type
                <select
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={composer.kind}
                  name="kind"
                  onChange={(event) =>
                    setComposer((current) =>
                      current
                        ? {
                            ...current,
                            kind: event.target.value === "reminder" ? "reminder" : "task",
                          }
                        : current,
                    )
                  }
                >
                  <option value="task">Task</option>
                  <option value="reminder">Reminder</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Date
                <input
                  className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={composer.scheduledDate}
                  name="scheduledDate"
                  required={composer.kind === "reminder" || !composer.item || Boolean(composer.item.scheduledDate)}
                  type="date"
                />
              </label>
              {(composer.kind === "task" || composer.kind === "reminder") && (
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-medium text-slate-600">
                    {composer.kind === "task" ? "Task category" : "Reminder category"}
                  </legend>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {(composer.kind === "task" ? taskCategories : reminderCategories).map((category) => (
                      <label
                        className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${category.chipClassName}`}
                        key={category.key}
                      >
                        <input
                          defaultChecked={
                            (composer.item?.categoryKey ??
                              (composer.kind === "task" ? defaultTaskCategory : defaultReminderCategory)) === category.key
                          }
                          name="categoryKey"
                          type="radio"
                          value={category.key}
                        />
                        <span className={`size-2.5 rounded-full ${category.dotClassName}`} />
                        {category.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Notes
                <textarea
                  className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={composer.item?.notes ?? ""}
                  name="notes"
                  placeholder="Optional context"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setComposer(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {composer.kind === "reminder" ? (
                  <BellRing aria-hidden="true" className="size-4 text-violet-300" />
                ) : (
                  <CalendarDays aria-hidden="true" className="size-4 text-emerald-300" />
                )}
                {composer.item ? "Save changes" : "Add to calendar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function CalendarItemChip({
  categories,
  item,
  onDelete,
  onEdit,
}: {
  categories: CalendarCategory[];
  item: CalendarItemRecord;
  onDelete: (id: number) => void;
  onEdit: (item: CalendarItemRecord) => void;
}) {
  const scopedCategories = categories.filter((category) =>
    item.kind === "reminder" ? category.scope === "reminders" : category.scope === "tasks",
  );
  const category = categoryFor(scopedCategories, item.categoryKey);
  const tone = item.kind === "reminder" && !category ? reminderTone : category.chipClassName;

  return (
    <article
      className={`min-w-0 cursor-pointer rounded-md border px-1.5 py-1 text-left ${tone}`}
      draggable
      onClick={() => onEdit(item)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/calendar-item-id", String(item.id));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        aria-label={`Open ${item.title}`}
        className="flex w-full min-w-0 items-start gap-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(item);
        }}
        type="button"
      >
        {item.kind === "reminder" ? (
          <BellRing aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        ) : (
          <span className={`mt-1 size-2 shrink-0 rounded-full ${category.dotClassName}`} />
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold sm:text-xs">
          {item.title}
        </span>
      </button>
      <div className="mt-1 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
        <button
          aria-label={`Edit ${item.title}`}
          className="grid size-5 place-items-center rounded text-current transition hover:bg-white/70"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item);
          }}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-3" />
        </button>
        <button
          aria-label={`Delete ${item.title}`}
          className="grid size-5 place-items-center rounded text-current transition hover:bg-white/70"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item.id);
          }}
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-3" />
        </button>
      </div>
    </article>
  );
}

function DraftAction({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
