import { WorkspaceShell } from "@/components/workspace-shell";

import { getKanbanBoardsForCurrentUser } from "./actions";
import { KanbanWorkspace } from "./kanban-workspace";

export default async function KanbanPage() {
  const boards = await getKanbanBoardsForCurrentUser();

  return (
    <WorkspaceShell>
      <KanbanWorkspace initialBoards={boards} />
    </WorkspaceShell>
  );
}
