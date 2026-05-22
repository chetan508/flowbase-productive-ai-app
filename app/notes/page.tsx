import { WorkspaceShell } from "@/components/workspace-shell";
import { NotesWorkspace } from "@/components/notes/notes-workspace";

export default function NotesPage() {
  return (
    <WorkspaceShell>
      <NotesWorkspace />
    </WorkspaceShell>
  );
}
