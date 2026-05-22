"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

type Presence = {
  cursor: { x: number; y: number } | null;
  activeTaskId: string | null;
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    initials: string;
    color: string;
  };
};

type ThreadMetadata = {
  boardId: string;
  taskId: string;
};

type CommentMetadata = {
  boardId?: string;
  taskId?: string;
};

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  resolveUsers: async ({ userIds }) => {
    const response = await fetch("/api/liveblocks-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds }),
    });

    if (!response.ok) {
      return userIds.map((id) => ({
        name: id,
        email: id,
        initials: id.slice(0, 2).toUpperCase(),
        color: "#38bdf8",
      }));
    }

    return response.json();
  },
});

export const {
  RoomProvider,
  useCreateThread,
  useOthers,
  useSelf,
  useThreads,
  useUpdateMyPresence,
} = createRoomContext<Presence, {}, UserMeta, never, ThreadMetadata, CommentMetadata>(client);
