import { WorkspaceShell } from "@/components/workspace-shell";

import { getSpacesForCurrentUser } from "./actions";
import { SpacesWorkspace } from "./spaces-workspace";

export default async function SpacesPage() {
  const spaces = await getSpacesForCurrentUser();

  return (
    <WorkspaceShell>
      <SpacesWorkspace initialSpaces={spaces} />
    </WorkspaceShell>
  );
}
