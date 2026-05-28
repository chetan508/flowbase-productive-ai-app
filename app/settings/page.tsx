import { WorkspaceShell } from "@/components/workspace-shell";

import { getSettingsPageDataAction } from "./actions";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage() {
  const data = await getSettingsPageDataAction();

  return (
    <WorkspaceShell>
      <SettingsWorkspace initialData={data} />
    </WorkspaceShell>
  );
}
