import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { db, generatedApps, kanbanBoards, spaces, userCategories, type User } from "@/db";
import { freePlanLimits } from "@/lib/plan-limits";

export type PlanTier = "free" | "pro";

export function isProPlan(plan?: PlanTier | string | null) {
  return plan === "pro";
}

export function planFromInput(plan?: string | null): PlanTier {
  return plan === "pro" ? "pro" : "free";
}

export async function getCurrentPlanTier(): Promise<PlanTier> {
  try {
    const { has } = await auth();
    if (has?.({ plan: "pro" })) {
      return "pro";
    }
  } catch {
    return "free";
  }

  return "free";
}

export async function getUsageCounts(user: User) {
  const [categories, apps, boards, ownedSpaces] = await Promise.all([
    db.query.userCategories.findMany({ where: eq(userCategories.userId, user.id) }),
    db.query.generatedApps.findMany({ where: eq(generatedApps.ownerId, user.id) }),
    db.query.kanbanBoards.findMany({ where: eq(kanbanBoards.ownerId, user.id) }),
    db.query.spaces.findMany({ where: eq(spaces.ownerId, user.id) }),
  ]);

  return {
    customCategories: categories.length,
    generatedApps: apps.length,
    kanbanBoards: boards.length,
    spaces: ownedSpaces.length,
  };
}

export async function assertWithinFreeLimit(
  user: User,
  key: keyof typeof freePlanLimits,
  plan: PlanTier = "free",
) {
  if (isProPlan(plan)) {
    return;
  }

  const usage = await getUsageCounts(user);
  if (usage[key] >= freePlanLimits[key]) {
    throw new Error(`Free plan limit reached. Upgrade to Pro for unlimited access.`);
  }
}
