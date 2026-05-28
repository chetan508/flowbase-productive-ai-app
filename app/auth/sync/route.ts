import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, users } from "@/db";

function getDisplayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.username || null;
}

function syncFailure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { redirectToSignIn, userId } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const user = await currentUser();

  if (!user) {
    return redirectToSignIn();
  }

  const primaryEmail = user.emailAddresses.find(
    (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail) {
    return syncFailure("A primary email is required to sync this user.", 422);
  }

  const [existingByClerkId, existingByEmail] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.clerkId, user.id),
    }),
    db.query.users.findFirst({
      where: eq(users.email, primaryEmail),
    }),
  ]);

  const name = getDisplayName(user);

  if (existingByClerkId) {
    if (existingByEmail && existingByEmail.id !== existingByClerkId.id) {
      return syncFailure(
        "This email address is already linked to another local user.",
        409,
      );
    }

    await db
      .update(users)
      .set({ email: primaryEmail, name })
      .where(eq(users.id, existingByClerkId.id));

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (existingByEmail) {
    if (existingByEmail.clerkId && existingByEmail.clerkId !== user.id) {
      return syncFailure(
        "This email address is already linked to another Clerk user.",
        409,
      );
    }

    await db
      .update(users)
      .set({ clerkId: user.id, name })
      .where(eq(users.id, existingByEmail.id));

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  await db.insert(users).values({
    clerkId: user.id,
    email: primaryEmail,
    name,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
