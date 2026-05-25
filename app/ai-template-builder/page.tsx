import { WorkspaceShell } from "@/components/workspace-shell";

import { getGeneratedAppsForCurrentUser } from "./actions";
import { TemplateBuilderWorkspace } from "./template-builder-workspace";

export default async function AiTemplateBuilderPage() {
  const apps = await getGeneratedAppsForCurrentUser();

  return (
    <WorkspaceShell>
      <TemplateBuilderWorkspace initialApps={apps} />
    </WorkspaceShell>
  );
}
