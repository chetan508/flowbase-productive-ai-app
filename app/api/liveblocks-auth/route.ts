import { NextResponse } from "next/server";

import { colorForIdentity, initialsFor } from "@/lib/identity";
import { getLiveblocks } from "@/lib/liveblocks";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export async function POST() {
  try {
    const user = await requireWorkspaceUser();
    const { status, body } = await getLiveblocks().identifyUser(user.email, {
      userInfo: {
        name: user.name ?? user.email.split("@")[0],
        email: user.email,
        initials: initialsFor(user.name, user.email),
        color: colorForIdentity(user.email),
      },
    });

    return new Response(body, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to authenticate Liveblocks.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
