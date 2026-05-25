"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Eye, Plus, Sparkles, Trash2, WandSparkles, X } from "lucide-react";

import { GeneratedAppIcon } from "@/components/generated-app-icon";
import { GeneratedAppPreview } from "@/components/generated-app-preview";

import {
  deleteGeneratedAppAction,
  generateTemplateAppAction,
  toggleGeneratedAppSidebarAction,
  type GeneratedAppRecord,
} from "./actions";

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function notifySidebarChanged() {
  window.dispatchEvent(new Event("generated-apps-sidebar-changed"));
}

export function TemplateBuilderWorkspace({ initialApps }: { initialApps: GeneratedAppRecord[] }) {
  const [apps, setApps] = useState(initialApps);
  const [prompt, setPrompt] = useState("");
  const [selectedApp, setSelectedApp] = useState<GeneratedAppRecord | null>(initialApps[0] ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2600);
  }

  function replaceApp(app: GeneratedAppRecord) {
    setApps((current) => current.map((item) => (item.id === app.id ? app : item)));
    setSelectedApp((current) => (current?.id === app.id ? app : current));
  }

  function generateApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const app = await generateTemplateAppAction(prompt);
        setApps((current) => [app, ...current]);
        setSelectedApp(app);
        setPrompt("");
        showFeedback("Template generated and saved.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not generate the template.");
      }
    });
  }

  function toggleSidebar(app: GeneratedAppRecord) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await toggleGeneratedAppSidebarAction(app.id, !app.addedToSidebar);
        replaceApp(updated);
        notifySidebarChanged();
        showFeedback(updated.addedToSidebar ? "Added to sidebar." : "Removed from sidebar.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not update the sidebar.");
      }
    });
  }

  function deleteApp(app: GeneratedAppRecord) {
    if (!window.confirm(`Delete "${app.appName}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteGeneratedAppAction(app.id);
        setApps((current) => current.filter((item) => item.id !== app.id));
        setSelectedApp((current) => (current?.id === app.id ? null : current));
        notifySidebarChanged();
        showFeedback("Generated app deleted.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not delete the app.");
      }
    });
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] space-y-4">
      <header className="rounded-lg border border-white/80 bg-white/85 p-4 shadow-sm shadow-slate-200/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-violet-600">AI Template Builder</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Generate a single-page mini app</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Describe a tracker, planner, dashboard, or workflow and Flowbase will save a structured JSON template for your workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-64">
            <div className="rounded-md bg-violet-50 p-3">
              <p className="text-lg font-semibold text-slate-950">{apps.length}</p>
              <p className="text-xs text-slate-500">Created apps</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3">
              <p className="text-lg font-semibold text-slate-950">{apps.filter((app) => app.addedToSidebar).length}/3</p>
              <p className="text-xs text-slate-500">Sidebar apps</p>
            </div>
          </div>
        </div>

        <form className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" onSubmit={generateApp}>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">App idea prompt</span>
            <textarea
              className="mt-1 min-h-28 w-full resize-y rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              disabled={isPending}
              maxLength={800}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Build a cozy study planner with subject goals, upcoming sessions, progress bars, and quick add fields."
              required
              value={prompt}
            />
          </label>
          <div className="flex items-end">
            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 lg:w-auto"
              disabled={isPending}
              type="submit"
            >
              <WandSparkles aria-hidden="true" className="size-4 text-violet-300" />
              {isPending ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {["Habit Tracker", "Budget Tracker", "Meal Planner", "Study Planner"].map((idea) => (
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 transition hover:border-violet-200 hover:text-slate-800"
              disabled={isPending}
              key={idea}
              onClick={() => setPrompt(`Create a ${idea} with stats, forms, lists, progress, and sample data.`)}
              type="button"
            >
              {idea}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </header>

      {selectedApp ? (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase text-slate-500">Generated preview</h2>
            <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href={`/ai-template-builder/${selectedApp.id}`}>
              <Eye aria-hidden="true" className="size-4" />
              Open page
            </Link>
          </div>
          <GeneratedAppPreview storageKey={`generated-app-data-${selectedApp.id}`} template={selectedApp.template} />
        </section>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-lg border border-dashed border-violet-200 bg-white/70 p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <Sparkles aria-hidden="true" className="size-6" />
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-950">No preview yet</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Generate your first mini app to see a live JSON-powered preview here.</p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Created apps</h2>
            <p className="text-sm text-slate-500">Saved only for your logged-in workspace account.</p>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            Your generated apps will appear here after the first successful generation.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <article className="rounded-lg border border-white/80 bg-white/88 p-4 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md" key={app.id}>
                <button className="flex w-full min-w-0 items-start gap-3 text-left" onClick={() => setSelectedApp(app)} type="button">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: app.color }}>
                    <GeneratedAppIcon className="size-5" name={app.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-slate-950">{app.appName}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-500">{app.description}</span>
                  </span>
                </button>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: app.color }} />
                    {app.color}
                  </span>
                  <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">{formatCreatedAt(app.createdAt)}</span>
                  {app.addedToSidebar && <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Sidebar</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href={`/ai-template-builder/${app.id}`}>
                    <Eye aria-hidden="true" className="size-4" />
                    Preview
                  </Link>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => toggleSidebar(app)}
                    type="button"
                  >
                    {app.addedToSidebar ? <X aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
                    {app.addedToSidebar ? "Remove Sidebar" : "Add Sidebar"}
                  </button>
                  <button
                    aria-label={`Delete ${app.appName}`}
                    className="grid size-9 place-items-center rounded-md border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => deleteApp(app)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {feedback && (
        <p aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">
          {feedback}
        </p>
      )}
    </div>
  );
}
