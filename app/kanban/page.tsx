import { WorkspaceShell } from "@/components/workspace-shell";

import { KanbanWorkspace } from "./kanban-workspace";

export default function KanbanPage() {
  return (
    <WorkspaceShell>
      <KanbanWorkspace />
    </WorkspaceShell>
  );
}
