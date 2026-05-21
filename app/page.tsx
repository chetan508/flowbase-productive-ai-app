import {
  CalendarDays,
  FileStack,
  Search,
  Sparkles,
  Workflow
} from "lucide-react";

import { WorkspaceShell } from "@/components/workspace-shell";

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

export default function Home() {
  return (
    <WorkspaceShell>
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
    </WorkspaceShell>
  );
}
