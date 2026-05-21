"use client";

import { useState, type ElementType } from "react";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileStack,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";

type MenuItem = {
  label: string;
  icon: ElementType;
  iconClassName: string;
  active?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        iconClassName: "text-sky-500",
        active: true,
      },
      {
        label: "AI Assistant",
        icon: Bot,
        iconClassName: "text-fuchsia-500",
      },
      {
        label: "Calendar",
        icon: CalendarDays,
        iconClassName: "text-emerald-500",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "Task / Kanban",
        icon: ListTodo,
        iconClassName: "text-amber-500",
      },
      {
        label: "Notes",
        icon: NotebookPen,
        iconClassName: "text-rose-500",
      },
      {
        label: "Whiteboard",
        icon: Workflow,
        iconClassName: "text-cyan-500",
      },
      {
        label: "Pages / Spaces",
        icon: FileStack,
        iconClassName: "text-indigo-500",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "AI Template Builder",
        icon: WandSparkles,
        iconClassName: "text-violet-500",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        icon: Settings2,
        iconClassName: "text-teal-500",
      },
    ],
  },
];

const todayTasks = [
  "Shape onboarding whiteboard",
  "Review sprint kanban lanes",
  "Turn meeting notes into tasks",
];

const recentSpaces = [
  { name: "Product launch map", meta: "Whiteboard updated 12m ago" },
  { name: "Weekly planning notes", meta: "6 linked tasks" },
  { name: "Research snippets", meta: "Shared with Design" },
];

const calendarBlocks = [
  { time: "09:30", title: "Planning sync", tone: "bg-emerald-400" },
  { time: "12:00", title: "Deep work block", tone: "bg-sky-400" },
  { time: "16:15", title: "AI template review", tone: "bg-amber-400" },
];

function SidebarItem({ collapsed, item }: { collapsed: boolean; item: MenuItem }) {
  const Icon = item.icon;

  return (
    <button
      aria-current={item.active ? "page" : undefined}
      aria-label={item.label}
      className={`group flex h-8 w-full items-center rounded-md border text-[13px] transition ${
        collapsed ? "justify-center px-0" : "justify-center px-0 sm:justify-start sm:gap-2 sm:px-2"
      } ${
        item.active
          ? "border-sky-200 bg-white text-slate-950 shadow-sm shadow-sky-100/80"
          : "border-transparent text-slate-600 hover:border-white/70 hover:bg-white/75 hover:text-slate-950"
      }`}
      title={item.label}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={`size-3.5 shrink-0 transition group-hover:scale-105 ${item.iconClassName}`}
      />
      {!collapsed && <span className="hidden truncate sm:block">{item.label}</span>}
    </button>
  );
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.13),_transparent_25%)]">
        <aside
          className={`flex h-screen min-h-0 shrink-0 flex-col border-r border-white/75 bg-[color:var(--sidebar)] px-2.5 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-[width] duration-300 ${
            collapsed ? "w-[72px]" : "w-[72px] sm:w-[218px]"
          }`}
        >
          <div
            className={`flex h-11 items-center rounded-lg border border-cyan-100/90 bg-white/80 ${
              collapsed ? "justify-center" : "gap-2 px-2"
            }`}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white shadow-sm shadow-cyan-200">
              <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
            </div>
            {!collapsed && (
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-950">Flowbase</p>
                <p className="truncate text-[11px] text-slate-500">Mindful workspace</p>
              </div>
            )}
          </div>

          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={`mt-1.5 flex h-7 items-center rounded-md border border-transparent text-slate-500 transition hover:border-white hover:bg-white/80 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              collapsed ? "justify-center" : "justify-between px-2"
            }`}
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {!collapsed && (
              <span className="hidden text-[11px] font-medium uppercase text-slate-400 sm:block">
                Menu
              </span>
            )}
            {collapsed ? (
              <ChevronRight aria-hidden="true" className="size-4" />
            ) : (
              <ChevronLeft aria-hidden="true" className="size-4" />
            )}
          </button>

          <nav aria-label="Primary" className="mt-1.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
            {menuGroups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                {!collapsed && (
                  <p className="hidden px-2 pb-0.5 text-[9px] font-bold uppercase text-cyan-700/70 sm:block">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarItem collapsed={collapsed} item={item} key={item.label} />
                  ))}
                </div>
              </section>
            ))}
          </nav>

          <footer className="space-y-1 border-t border-cyan-100/90 pt-2">
            <div
              className={`flex min-h-11 items-center rounded-lg border border-cyan-100/90 bg-white/80 ${
                collapsed ? "justify-center" : "gap-2 px-2"
              }`}
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-rose-100 text-xs font-bold text-rose-600">
                FL
              </div>
              {!collapsed && (
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-xs font-semibold text-slate-900">Flow Lab</p>
                  <p className="truncate text-[11px] text-slate-500">4 collaborators online</p>
                </div>
              )}
            </div>
            <button
              aria-label={collapsed ? "Workspace is synced" : undefined}
              className={`flex h-7 w-full items-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 ${
                collapsed ? "justify-center" : "justify-between px-2"
              }`}
              title={collapsed ? "Workspace is synced" : undefined}
              type="button"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              {!collapsed && <span className="hidden text-[11px] font-medium sm:block">Workspace synced</span>}
            </button>
          </footer>
        </aside>

        <section className="h-screen min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border/80 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Thursday focus</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">Dashboard</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-white bg-white/80 px-3 text-sm text-slate-500 shadow-sm shadow-slate-200/60 sm:w-64">
                <Search aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">Search notes, boards, tasks</span>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                type="button"
              >
                <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
                Create
              </button>
            </div>
          </header>

          <div className="grid gap-4 py-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold uppercase text-sky-600">Focus board</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      Blend planning, notes, and whiteboards in one calm view.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Keep the day moving with linked work surfaces, quick AI support, and
                      a space for ideas before they become tasks.
                    </p>
                  </div>
                  <div className="grid min-w-40 grid-cols-2 gap-2">
                    <div className="rounded-md bg-sky-50 p-3">
                      <p className="text-lg font-semibold text-slate-950">12</p>
                      <p className="text-xs text-slate-500">Open tasks</p>
                    </div>
                    <div className="rounded-md bg-rose-50 p-3">
                      <p className="text-lg font-semibold text-slate-950">3</p>
                      <p className="text-xs text-slate-500">Boards live</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-950">Today</h2>
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      68% clear
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {todayTasks.map((task, index) => (
                      <div
                        className="flex min-h-11 items-center gap-3 rounded-md border border-slate-100 bg-[color:var(--soft-panel)] px-3"
                        key={task}
                      >
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${
                            index === 0
                              ? "bg-sky-400"
                              : index === 1
                                ? "bg-emerald-400"
                                : "bg-rose-400"
                          }`}
                        />
                        <p className="min-w-0 truncate text-sm text-slate-700">{task}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-950">Recent spaces</h2>
                    <FileStack aria-hidden="true" className="size-4 text-indigo-500" />
                  </div>
                  <div className="mt-3 space-y-2">
                    {recentSpaces.map((space) => (
                      <div
                        className="rounded-md border border-slate-100 bg-[color:var(--soft-panel)] px-3 py-2.5"
                        key={space.name}
                      >
                        <p className="truncate text-sm font-medium text-slate-800">{space.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{space.meta}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-950">Calendar lane</h2>
                  <CalendarDays aria-hidden="true" className="size-4 text-emerald-500" />
                </div>
                <div className="mt-3 space-y-2">
                  {calendarBlocks.map((block) => (
                    <div className="flex items-center gap-3 rounded-md bg-[color:var(--soft-panel)] p-3" key={block.title}>
                      <span className={`h-9 w-1 rounded-full ${block.tone}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">{block.time}</p>
                        <p className="truncate text-sm text-slate-800">{block.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-950">Whiteboard pulse</h2>
                  <Workflow aria-hidden="true" className="size-4 text-cyan-500" />
                </div>
                <div className="mt-3 grid min-h-52 grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-200 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:24px_24px] p-3">
                  <div className="self-start rounded-md border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800 shadow-sm">
                    Capture ideas
                  </div>
                  <div className="mt-9 rounded-md border border-sky-100 bg-sky-50 p-3 text-sm text-sky-800 shadow-sm">
                    Map flows
                  </div>
                  <div className="col-span-2 mx-auto rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 shadow-sm">
                    Ship the next move
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
