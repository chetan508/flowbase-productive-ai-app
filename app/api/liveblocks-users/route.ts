import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, users } from "@/db";
import { colorForIdentity, initialsFor, normalizeEmail } from "@/lib/identity";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export async function POST(request: Request) {
  await requireWorkspaceUser();

  const payload = (await request.json().catch(() => ({}))) as { userIds?: string[] };
  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
  const emails = userIds.map(normalizeEmail);

  if (emails.length === 0) {
    return NextResponse.json([]);
  }

  const foundUsers = await db.query.users.findMany({
    where: inArray(users.email, emails),
  });

  return NextResponse.json(
    emails.map((email) => {
      const user = foundUsers.find((item) => item.email === email);
      const name = user?.name ?? email.split("@")[0] ?? "Collaborator";

      return {
        name,
        email,
        initials: initialsFor(name, email),
        color: colorForIdentity(email),
      };
    }),
  );
}
