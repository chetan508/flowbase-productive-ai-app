import type {
  KanbanBoard,
  KanbanBoardMember,
  KanbanColumn,
  KanbanTask,
  User,
} from "@/db";
import { colorForIdentity, initialsFor } from "@/lib/identity";

export type Priority = "Low" | "Medium" | "High";
export type MemberRole = "owner" | "editor";
export type MemberStatus = "active" | "pending";

export type KanbanMemberRecord = {
  id: number;
  userId: number | null;
  email: string;
  name: string | null;
  initials: string;
  color: string;
  role: MemberRole;
  status: MemberStatus;
};

export type KanbanTaskRecord = {
  id: number;
  columnId: number;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  labelIds: string[];
  syncCalendar: boolean;
  linkNotes: boolean;
  position: number;
};

export type KanbanColumnRecord = {
  id: number;
  name: string;
  position: number;
  tasks: KanbanTaskRecord[];
};

export type KanbanBoardRecord = {
  id: number;
  name: string;
  color: string;
  ownerId: number;
  members: KanbanMemberRecord[];
  columns: KanbanColumnRecord[];
};

export type KanbanTaskInput = {
  id?: number;
  boardId: number;
  columnId: number;
  title: string;
  description: string;
  dueDate?: string | null;
  priority: Priority;
  labelIds: string[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

export const kanbanRoomId = (boardId: number | string) => `kanban:${boardId}`;

export function toMemberRecord(
  member: KanbanBoardMember,
  user?: Pick<User, "id" | "name" | "email"> | null,
): KanbanMemberRecord {
  const email = member.email;
  const name = user?.name ?? null;

  return {
    id: member.id,
    userId: member.userId,
    email,
    name,
    initials: initialsFor(name, email),
    color: colorForIdentity(email),
    role: member.role === "owner" ? "owner" : "editor",
    status: member.status === "active" ? "active" : "pending",
  };
}

export function toTaskRecord(task: KanbanTask): KanbanTaskRecord {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? "",
    priority: isPriority(task.priority) ? task.priority : "Medium",
    labelIds: task.labelIds ? task.labelIds.split(",").filter(Boolean) : [],
    syncCalendar: task.syncCalendar === 1,
    linkNotes: task.linkNotes === 1,
    position: task.position,
  };
}

export function toBoardRecord(
  board: KanbanBoard,
  columns: KanbanColumn[],
  tasks: KanbanTask[],
  members: KanbanMemberRecord[],
): KanbanBoardRecord {
  return {
    id: board.id,
    name: board.name,
    color: board.color,
    ownerId: board.ownerId,
    members,
    columns: columns.map((column) => ({
      id: column.id,
      name: column.name,
      position: column.position,
      tasks: tasks
        .filter((task) => task.columnId === column.id)
        .sort((left, right) => left.position - right.position)
        .map(toTaskRecord),
    })),
  };
}

export function isPriority(value: string): value is Priority {
  return value === "Low" || value === "Medium" || value === "High";
}

export function cleanLabelIds(labelIds: string[]) {
  return labelIds.map((label) => label.trim()).filter(Boolean).join(",");
}
