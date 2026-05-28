import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f5fbfd_0%,#ffffff_55%,#f7fbff_100%)] px-6 text-slate-950">
      <div className="flex flex-col items-center text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-slate-950 text-white shadow-sm shadow-cyan-200">
          <Sparkles aria-hidden="true" className="size-5 animate-pulse text-amber-300" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-900">Loading Flowbase</p>
        <p className="mt-1 text-sm text-slate-500">Preparing your workspace.</p>
      </div>
    </main>
  );
}
