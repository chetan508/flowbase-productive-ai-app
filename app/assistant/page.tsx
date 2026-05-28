import { WorkspaceShell } from "@/components/workspace-shell";

import { AssistantWorkspace } from "./assistant-workspace";

export default function AssistantPage() {
  return (
    <WorkspaceShell>
      <AssistantWorkspace />
    </WorkspaceShell>
  );
}
