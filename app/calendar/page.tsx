import { asc, eq } from "drizzle-orm";

import { CalendarWorkspace } from "@/app/calendar/calendar-workspace";
import { calendarItems, db } from "@/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireCalendarUser } from "@/lib/calendar-user";
import { calendarCategoryTone, toCalendarItemRecord, type CalendarCategory } from "@/lib/calendar";
import { ensureUserCategories, toCategoryRecord } from "@/lib/settings";

export default async function CalendarPage() {
  const user = await requireCalendarUser();
  const items = await db.query.calendarItems.findMany({
    orderBy: [asc(calendarItems.scheduledDate), asc(calendarItems.createdAt)],
    where: eq(calendarItems.userId, user.id),
  });
  const categories = (await ensureUserCategories(user.id)).map(toCategoryRecord);
  const calendarCategories: CalendarCategory[] = categories
    .filter(
      (category): category is typeof category & { scope: "tasks" | "reminders" } =>
        category.scope === "tasks" || category.scope === "reminders",
    )
    .map((category) => ({
      key: String(category.id),
      scope: category.scope,
      label: category.name,
      color: category.color,
      icon: category.icon,
      ...calendarCategoryTone(category.color),
    }));

  return (
    <WorkspaceShell>
      <CalendarWorkspace
        initialCategories={calendarCategories}
        initialItems={items.map(toCalendarItemRecord)}
      />
    </WorkspaceShell>
  );
}
