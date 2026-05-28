import { WorkspaceShell } from "@/components/workspace-shell";
import { NotesWorkspace } from "@/components/notes/notes-workspace";
import { getNotesForCurrentUser } from "./actions";

export default async function NotesPage() {
  const notes = await getNotesForCurrentUser();

  return (
    <WorkspaceShell>
      <NotesWorkspace initialNotes={notes} />
    </WorkspaceShell>
  );
}
