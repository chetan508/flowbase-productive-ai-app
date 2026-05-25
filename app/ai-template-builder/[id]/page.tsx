import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GeneratedAppPreview } from "@/components/generated-app-preview";
import { WorkspaceShell } from "@/components/workspace-shell";

import { getGeneratedAppAction } from "../actions";

export default async function GeneratedAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) notFound();

  const app = await getGeneratedAppAction(appId);
  if (!app) notFound();

  return (
    <WorkspaceShell>
      <div className="min-h-[calc(100vh-2rem)] space-y-4">
        <header className="rounded-lg border border-white/80 bg-white/85 p-4 shadow-sm shadow-slate-200/60">
          <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href="/ai-template-builder">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to builder
          </Link>
          <div className="mt-4">
            <p className="text-sm font-medium text-violet-600">Generated app preview</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{app.appName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{app.description}</p>
          </div>
        </header>

        <GeneratedAppPreview storageKey={`generated-app-data-${app.id}`} template={app.template} />
      </div>
    </WorkspaceShell>
  );
}
