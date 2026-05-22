import { Liveblocks, type RoomAccesses } from "@liveblocks/node";

import { kanbanRoomId } from "@/lib/kanban";

let client: Liveblocks | null = null;

function getLiveblocksClient() {
  if (client) {
    return client;
  }

  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required for collaboration.");
  }

  client = new Liveblocks({ secret });
  return client;
}

export function getLiveblocks() {
  return getLiveblocksClient();
}

export async function ensureKanbanRoom(boardId: number, emails: string[]) {
  const usersAccesses = emails.reduce<RoomAccesses>((accesses, email) => {
    accesses[email] = ["room:write"];
    return accesses;
  }, {});

  return getLiveblocksClient().getOrCreateRoom(kanbanRoomId(boardId), {
    defaultAccesses: [],
    usersAccesses,
    metadata: {
      kind: "kanban",
      boardId: String(boardId),
    },
  });
}

export async function grantKanbanRoomAccess(boardId: number, email: string) {
  return getLiveblocksClient().updateRoom(kanbanRoomId(boardId), {
    usersAccesses: {
      [email]: ["room:write"],
    },
  });
}

export async function tryEnsureKanbanRoom(boardId: number, emails: string[]) {
  try {
    await ensureKanbanRoom(boardId, emails);
  } catch (error) {
    console.warn(error);
  }
}

export async function tryGrantKanbanRoomAccess(boardId: number, email: string) {
  try {
    await grantKanbanRoomAccess(boardId, email);
  } catch (error) {
    console.warn(error);
  }
}
