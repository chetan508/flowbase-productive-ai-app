import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <WorkspaceShell>
      <div className="space-y-5">
        <header className="border-b border-border/80 pb-5">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-52 animate-pulse rounded bg-slate-200" />
        </header>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card className="rounded-lg border-white/80 bg-white/85 shadow-sm shadow-slate-200/60" key={index}>
              <CardContent className="space-y-4 p-4">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="h-96 animate-pulse rounded-lg bg-white/80" />
          <div className="h-96 animate-pulse rounded-lg bg-white/80" />
        </section>
      </div>
    </WorkspaceShell>
  );
}
