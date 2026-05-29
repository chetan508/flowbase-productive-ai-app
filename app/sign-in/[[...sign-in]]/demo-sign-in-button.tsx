"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoSignInButton() {
  const router = useRouter();
  const { isLoaded, setActive, signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function signInAsDemo() {
    if (!isLoaded || !signIn || !setActive) return;

    setError(null);
    setIsSigningIn(true);

    try {
      const response = await fetch("/api/demo-login", { method: "POST" });
      const data = (await response.json()) as { token?: string; error?: string };

      if (!response.ok || !data.token) {
        throw new Error(data.error ?? "Unable to start demo login.");
      }

      const attempt = await signIn.create({
        strategy: "ticket",
        ticket: data.token,
      });

      if (attempt.status !== "complete" || !attempt.createdSessionId) {
        throw new Error("Demo sign-in needs another step. Please try again.");
      }

      await setActive({ session: attempt.createdSessionId });
      router.push("/auth/sync");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Demo login failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!isLoaded || isSigningIn}
        onClick={signInAsDemo}
        type="button"
      >
        <LogIn aria-hidden="true" className="size-4" />
        {isSigningIn ? "Signing in..." : "Continue as demo"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
    </div>
  );
}
