import { WorkspaceShell } from "@/components/workspace-shell";

import { getWhiteboardsForCurrentUser } from "./actions";
import { WhiteboardWorkspace } from "./whiteboard-workspace";

export default async function WhiteboardPage() {
  const whiteboards = await getWhiteboardsForCurrentUser();

  return (
    <WorkspaceShell>
      <WhiteboardWorkspace initialWhiteboards={whiteboards} />
    </WorkspaceShell>
  );
}
