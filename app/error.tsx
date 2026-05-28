"use client";

import { AlertTriangle } from "lucide-react";

import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-rose-100 bg-white/85 p-6 text-center shadow-sm shadow-slate-200/60">
          <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-950">Dashboard could not load</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error.message || "Something went wrong while collecting your productivity data."}
          </p>
          <Button className="mt-4 rounded-lg bg-slate-950 text-white hover:bg-slate-800" onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </div>
    </WorkspaceShell>
  );
}
