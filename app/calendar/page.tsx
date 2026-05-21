import { asc, eq } from "drizzle-orm";

import { CalendarWorkspace } from "@/app/calendar/calendar-workspace";
import { calendarItems, db } from "@/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireCalendarUser } from "@/lib/calendar-user";
import { toCalendarItemRecord } from "@/lib/calendar";

export default async function CalendarPage() {
  const user = await requireCalendarUser();
  const items = await db.query.calendarItems.findMany({
    orderBy: [asc(calendarItems.scheduledDate), asc(calendarItems.createdAt)],
    where: eq(calendarItems.userId, user.id),
  });

  return (
    <WorkspaceShell>
      <CalendarWorkspace initialItems={items.map(toCalendarItemRecord)} />
    </WorkspaceShell>
  );
}
