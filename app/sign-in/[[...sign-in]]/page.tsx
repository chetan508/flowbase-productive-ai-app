import { SignIn } from "@clerk/nextjs";
import { Mail } from "lucide-react";

import { DemoSignInButton } from "./demo-sign-in-button";

const demoCredentials = {
  email: "demo@flowbase.app",
};

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-8">
      <div className="grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[minmax(280px,0.82fr)_auto]">
        <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-white shadow-2xl shadow-slate-950/40">
          <p className="text-sm font-medium text-cyan-200">Demo access</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">Flowbase workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use the demo button to preview the app without an email verification code.
          </p>

          <div className="mt-5 grid gap-3">
            <label className="block text-sm font-medium text-slate-200">
              Demo ID
              <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-slate-900/80 px-3 text-sm text-white">
                <Mail aria-hidden="true" className="size-4 shrink-0 text-cyan-300" />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  readOnly
                  value={demoCredentials.email}
                />
              </span>
            </label>
          </div>
          <DemoSignInButton />
        </section>

        <div className="flex justify-center">
          <SignIn
            forceRedirectUrl="/auth/sync"
            signUpForceRedirectUrl="/auth/sync"
          />
        </div>
      </div>
    </main>
  );
}
