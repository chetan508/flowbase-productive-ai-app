import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db, users } from "@/db";
import { normalizeEmail } from "@/lib/identity";

function displayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return fullName || user.username || null;
}

export async function requireWorkspaceUser() {
  const { redirectToSignIn, userId } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses.find(
    (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!clerkUser || !primaryEmail) {
    throw new Error("A signed-in user with a primary email is required.");
  }

  const email = normalizeEmail(primaryEmail);
  const emailMatch = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (emailMatch) {
    const [linkedUser] = await db
      .update(users)
      .set({ clerkId: clerkUser.id, name: displayName(clerkUser), email })
      .where(eq(users.id, emailMatch.id))
      .returning();

    return linkedUser;
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email,
      name: displayName(clerkUser),
    })
    .returning();

  return createdUser;
}
