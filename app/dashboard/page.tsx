import Link from "next/link";
import {
  and,
  desc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Plus,
  Sparkles,
  StickyNote,
  WandSparkles,
  Workflow,
} from "lucide-react";

import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calendarItems,
  db,
  generatedApps,
  kanbanBoardMembers,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  pages,
  userCategories,
  whiteboards,
} from "@/db";
import { calendarCategoryTone } from "@/lib/calendar";
import { defaultAiSettings, ensureUserSettings, normalizeAiSettings } from "@/lib/settings";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

type Activity = {
  title: string;
  meta: string;
  at: Date;
  href: string;
  icon: typeof StickyNote;
  tone: string;
};

type RecentPage = {
  title: string;
  meta: string;
  at: Date;
  href: string;
  icon: typeof StickyNote;
  color: string;
};

function todayKey() {
  const today = new Date();
  return [
    today.getFullYear(),
    `${today.getMonth() + 1}`.padStart(2, "0"),
    `${today.getDate()}`.padStart(2, "0"),
  ].join("-");
}

function dateFromKey(value: string | null) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function formatDateTime(date: Date | null) {
  if (!date) return "Unscheduled";
  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return dateFormatter.format(date);
}

function statusLabel(count: number, disabled = false) {
  if (disabled) return "Disabled";
  return count > 0 ? "Active" : "Ready";
}

function completedColumnName(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized.includes("done") || normalized.includes("complete") || normalized.includes("shipped");
}

function activityMeta(action: string, date: Date) {
  return `${action} ${relativeTime(date)}`;
}

export default async function Home() {
  const user = await requireWorkspaceUser();
  const settings = await ensureUserSettings(user);
  const aiSettings = normalizeAiSettings(settings.aiSettings ?? defaultAiSettings);

  const [ownedBoards, memberships, userNotes, userWhiteboards, userApps, userCalendarItems, categories, userPages] =
    await Promise.all([
      db.query.kanbanBoards.findMany({
        orderBy: [desc(kanbanBoards.updatedAt), desc(kanbanBoards.createdAt)],
        where: eq(kanbanBoards.ownerId, user.id),
      }),
      db.query.kanbanBoardMembers.findMany({
        where: or(eq(kanbanBoardMembers.userId, user.id), eq(kanbanBoardMembers.email, user.email)),
      }),
      db.query.notes.findMany({
        orderBy: [desc(notes.updatedAt), desc(notes.createdAt)],
        where: and(eq(notes.ownerId, user.id), eq(notes.trashed, 0)),
      }),
      db.query.whiteboards.findMany({
        orderBy: [desc(whiteboards.updatedAt), desc(whiteboards.createdAt)],
        where: eq(whiteboards.ownerId, user.id),
      }),
      db.query.generatedApps.findMany({
        orderBy: [desc(generatedApps.updatedAt), desc(generatedApps.createdAt)],
        where: eq(generatedApps.ownerId, user.id),
      }),
      db.query.calendarItems.findMany({
        orderBy: [desc(calendarItems.updatedAt), desc(calendarItems.createdAt)],
        where: eq(calendarItems.userId, user.id),
      }),
      db.query.userCategories.findMany({
        where: eq(userCategories.userId, user.id),
      }),
      db.query.pages.findMany({
        orderBy: [desc(pages.updatedAt), desc(pages.createdAt)],
        where: and(eq(pages.ownerId, user.id), eq(pages.archived, 0)),
      }),
    ]);

  const boardIds = Array.from(new Set([...ownedBoards.map((board) => board.id), ...memberships.map((member) => member.boardId)]));
  const [boardColumns, boardTasks] =
    boardIds.length > 0
      ? await Promise.all([
          db.query.kanbanColumns.findMany({ where: inArray(kanbanColumns.boardId, boardIds) }),
          db.query.kanbanTasks.findMany({
            orderBy: [desc(kanbanTasks.updatedAt), desc(kanbanTasks.createdAt)],
            where: inArray(kanbanTasks.boardId, boardIds),
          }),
        ])
      : [[], []];

  const today = todayKey();
  const doneColumnIds = new Set(boardColumns.filter((column) => completedColumnName(column.name)).map((column) => column.id));
  const completedTasks = boardTasks.filter((task) => doneColumnIds.has(task.columnId));
  const pendingTasks = boardTasks.filter((task) => !doneColumnIds.has(task.columnId));
  const overdueTasks = pendingTasks.filter((task) => Boolean(task.dueDate && task.dueDate < today));
  const progress = boardTasks.length ? Math.round((completedTasks.length / boardTasks.length) * 100) : 0;
  const todaysReminders = userCalendarItems.filter((item) => item.scheduledDate === today);
  const upcomingCalendar = userCalendarItems
    .filter((item) => item.scheduledDate && item.scheduledDate >= today)
    .sort((left, right) => String(left.scheduledDate).localeCompare(String(right.scheduledDate)))
    .slice(0, 6);

  const categoryMap = new Map(categories.map((category) => [String(category.id), category]));
  const mostActiveWorkspace = [
    { name: "Notes", count: userNotes.length },
    { name: "Kanban", count: boardTasks.length },
    { name: "Calendar", count: userCalendarItems.length },
    { name: "Whiteboard", count: userWhiteboards.length },
    { name: "AI Templates", count: userApps.length },
  ].sort((left, right) => right.count - left.count)[0];

  const featureCards = [
    {
      name: "Calendar",
      icon: CalendarDays,
      status: statusLabel(userCalendarItems.length),
      stat: `${userCalendarItems.length} items`,
      detail: `${upcomingCalendar.length} upcoming`,
      tone: "text-sky-600 bg-sky-50 border-sky-100",
    },
    {
      name: "Kanban / Tasks",
      icon: ListChecks,
      status: statusLabel(boardTasks.length),
      stat: `${boardTasks.length} tasks`,
      detail: `${ownedBoards.length} owned boards`,
      tone: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      name: "Notes",
      icon: NotebookPen,
      status: statusLabel(userNotes.length),
      stat: `${userNotes.length} notes`,
      detail: `${userNotes.filter((note) => note.pinned === 1).length} pinned`,
      tone: "text-violet-600 bg-violet-50 border-violet-100",
    },
    {
      name: "Whiteboard",
      icon: Workflow,
      status: statusLabel(userWhiteboards.length),
      stat: `${userWhiteboards.length} boards`,
      detail: `${userWhiteboards.reduce((count, board) => count + (Array.isArray(board.scene?.elements) ? board.scene.elements.length : 0), 0)} elements`,
      tone: "text-cyan-600 bg-cyan-50 border-cyan-100",
    },
    {
      name: "AI Assistant",
      icon: Bot,
      status: statusLabel(1, !aiSettings.features.assistant),
      stat: aiSettings.features.assistant ? "Enabled" : "Off in settings",
      detail: `${aiSettings.tone} tone`,
      tone: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      name: "AI Template Builder",
      icon: WandSparkles,
      status: statusLabel(userApps.length, !aiSettings.features.templateBuilder),
      stat: `${userApps.length} apps`,
      detail: `${userApps.filter((app) => app.addedToSidebar === 1).length} in sidebar`,
      tone: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  const quickActions = [
    { label: "Create Task", href: "/kanban", icon: Plus, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Add Calendar Reminder", href: "/calendar", icon: CalendarDays, tone: "text-sky-600 bg-sky-50" },
    { label: "Create Note", href: "/notes", icon: NotebookPen, tone: "text-violet-600 bg-violet-50" },
    { label: "Open Whiteboard", href: "/whiteboard", icon: Workflow, tone: "text-cyan-600 bg-cyan-50" },
    { label: "Ask AI Assistant", href: "/assistant", icon: Bot, tone: "text-rose-600 bg-rose-50" },
    { label: "Generate AI Template", href: "/ai-template-builder", icon: WandSparkles, tone: "text-amber-600 bg-amber-50" },
  ];

  const recentActivity: Activity[] = [
    ...boardTasks.map((task) => ({
      title: task.title,
      meta: activityMeta(task.createdAt.getTime() === task.updatedAt.getTime() ? "Created task" : "Updated task", task.updatedAt),
      at: task.updatedAt,
      href: "/kanban",
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50",
    })),
    ...userNotes.map((note) => ({
      title: note.title,
      meta: activityMeta(note.createdAt.getTime() === note.updatedAt.getTime() ? "Created note" : "Updated note", note.updatedAt),
      at: note.updatedAt,
      href: "/notes",
      icon: StickyNote,
      tone: "text-violet-600 bg-violet-50",
    })),
    ...userCalendarItems.map((item) => ({
      title: item.title,
      meta: activityMeta(item.kind === "reminder" ? "Added calendar reminder" : "Updated calendar task", item.updatedAt),
      at: item.updatedAt,
      href: "/calendar",
      icon: CalendarDays,
      tone: "text-sky-600 bg-sky-50",
    })),
    ...userWhiteboards.map((board) => ({
      title: board.name,
      meta: activityMeta(board.createdAt.getTime() === board.updatedAt.getTime() ? "Created whiteboard" : "Updated whiteboard", board.updatedAt),
      at: board.updatedAt,
      href: "/whiteboard",
      icon: Workflow,
      tone: "text-cyan-600 bg-cyan-50",
    })),
    ...userApps.map((app) => ({
      title: app.appName,
      meta: activityMeta("Generated AI template", app.updatedAt),
      at: app.updatedAt,
      href: `/ai-template-builder/${app.id}`,
      icon: Sparkles,
      tone: "text-amber-600 bg-amber-50",
    })),
  ].sort((left, right) => right.at.getTime() - left.at.getTime()).slice(0, 8);

  const recentPages: RecentPage[] = [
    ...userNotes.map((note) => ({
      title: note.title,
      meta: `Note updated ${relativeTime(note.updatedAt)}`,
      at: note.updatedAt,
      href: "/notes",
      icon: FileText,
      color: "#8b5cf6",
    })),
    ...userWhiteboards.map((board) => ({
      title: board.name,
      meta: `Whiteboard updated ${relativeTime(board.updatedAt)}`,
      at: board.updatedAt,
      href: "/whiteboard",
      icon: Workflow,
      color: board.color,
    })),
    ...ownedBoards.map((board) => ({
      title: board.name,
      meta: `Kanban board updated ${relativeTime(board.updatedAt)}`,
      at: board.updatedAt,
      href: "/kanban",
      icon: ClipboardList,
      color: board.color,
    })),
    ...userApps.map((app) => ({
      title: app.appName,
      meta: `AI template updated ${relativeTime(app.updatedAt)}`,
      at: app.updatedAt,
      href: `/ai-template-builder/${app.id}`,
      icon: WandSparkles,
      color: app.color,
    })),
    ...userPages.map((page) => ({
      title: page.name,
      meta: `${page.type} updated ${relativeTime(page.updatedAt)}`,
      at: page.updatedAt,
      href: "/spaces",
      icon: FileText,
      color: "#38bdf8",
    })),
  ].sort((left, right) => right.at.getTime() - left.at.getTime()).slice(0, 6);

  const insights = [
    overdueTasks.length > 0 ? `You have ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"}.` : "No overdue tasks right now.",
    `Your most active workspace is ${mostActiveWorkspace?.name ?? "Flowbase"}.`,
    boardTasks.length > 0 ? `You completed ${progress}% of tasks on your boards.` : "Create your first task to start tracking completion.",
    todaysReminders.length > 0 ? `You have ${todaysReminders.length} reminder${todaysReminders.length === 1 ? "" : "s"} today.` : "No calendar reminders scheduled for today.",
    overdueTasks.length > 0 ? "Suggested focus: finish high-priority overdue tasks first." : "Suggested focus: plan the next concrete task before opening new work.",
  ];

  return (
    <WorkspaceShell>
      <div className="space-y-5">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Welcome back, {settings.displayName || user.name || "there"}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Dashboard</h1>
          </div>
          <Button asChild className="h-10 rounded-lg bg-slate-950 px-3 text-white shadow-sm hover:bg-slate-800">
            <Link href="/assistant">
              <Sparkles aria-hidden="true" className="mr-2 size-4 text-amber-300" />
              Ask AI
            </Link>
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60" key={feature.name}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn("rounded-lg border p-2", feature.tone)}>
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <span className="rounded-md bg-[color:var(--soft-panel)] px-2 py-1 text-xs font-medium text-slate-600">
                      {feature.status}
                    </span>
                  </div>
                  <h2 className="mt-3 text-sm font-semibold text-slate-950">{feature.name}</h2>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-700">{feature.stat}</span>
                    <span className="truncate text-xs text-slate-500">{feature.detail}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-4">
            <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                <CardTitle className="text-base text-slate-950">Quick access</CardTitle>
                <LayoutDashboard aria-hidden="true" className="size-4 text-slate-400" />
              </CardHeader>
              <CardContent className="grid gap-2 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] px-3 text-sm font-medium text-slate-800 transition hover:border-slate-200 hover:bg-white"
                      href={action.href}
                      key={action.label}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={cn("rounded-md p-1.5", action.tone)}>
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <span className="truncate">{action.label}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                  <CardTitle className="text-base text-slate-950">Recent activity</CardTitle>
                  <Clock3 aria-hidden="true" className="size-4 text-slate-400" />
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-3 transition hover:bg-white"
                          href={item.href}
                          key={`${item.meta}-${item.title}`}
                        >
                          <span className={cn("rounded-md p-1.5", item.tone)}>
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-800">{item.title}</span>
                            <span className="block truncate text-xs text-slate-500">{item.meta}</span>
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState text="No activity yet. Create a task, note, reminder, whiteboard, or AI template to fill this timeline." />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                  <CardTitle className="text-base text-slate-950">Recent pages</CardTitle>
                  <FileText aria-hidden="true" className="size-4 text-slate-400" />
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  {recentPages.length > 0 ? (
                    recentPages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <Link
                          className="flex items-center gap-3 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-3 transition hover:bg-white"
                          href={page.href}
                          key={`${page.meta}-${page.title}`}
                        >
                          <span className="rounded-md p-1.5 text-white" style={{ backgroundColor: page.color }}>
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-800">{page.title}</span>
                            <span className="block truncate text-xs text-slate-500">{page.meta}</span>
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <EmptyState text="No pages have been opened or updated yet." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                <CardTitle className="text-base text-slate-950">Task summary</CardTitle>
                <ListChecks aria-hidden="true" className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <SummaryMetric label="Total" value={boardTasks.length} />
                  <SummaryMetric label="Completed" value={completedTasks.length} />
                  <SummaryMetric label="Pending" value={pendingTasks.length} />
                  <SummaryMetric label="Overdue" value={overdueTasks.length} tone="text-rose-600" />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Progress</span>
                    <span className="font-semibold text-slate-950">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                <CardTitle className="text-base text-slate-950">Upcoming calendar</CardTitle>
                <CalendarDays aria-hidden="true" className="size-4 text-sky-500" />
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {upcomingCalendar.length > 0 ? (
                  upcomingCalendar.map((item) => {
                    const category = item.categoryKey ? categoryMap.get(String(item.categoryKey)) : null;
                    const color = category?.color ?? (item.kind === "reminder" ? "#8b5cf6" : "#38bdf8");
                    const tone = calendarCategoryTone(color);
                    return (
                      <Link
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-3 transition hover:bg-white"
                        href="/calendar"
                        key={item.id}
                      >
                        <span className="h-10 w-1 rounded-full" style={{ backgroundColor: color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{item.title}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {formatDateTime(dateFromKey(item.scheduledDate))}
                          </span>
                        </span>
                        <span className={cn("shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium capitalize", tone.chipClassName)}>
                          {item.kind}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState text="No upcoming scheduled tasks or reminders." />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4">
                <CardTitle className="text-base text-slate-950">AI insights</CardTitle>
                <Sparkles aria-hidden="true" className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {insights.map((insight, index) => (
                  <div className="flex gap-3 rounded-lg bg-[color:var(--soft-panel)] p-3 text-sm text-slate-700" key={insight}>
                    {index === 0 && overdueTasks.length > 0 ? (
                      <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 fill-rose-400 text-rose-400" />
                    ) : (
                      <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 fill-emerald-400 text-emerald-400" />
                    )}
                    <span>{insight}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-[color:var(--soft-panel)] p-4 text-sm text-slate-500">
      {text}
    </div>
  );
}

function SummaryMetric({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--soft-panel)] p-3">
      <p className={cn("text-lg font-semibold", tone)}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
