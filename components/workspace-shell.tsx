"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileStack,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Settings2,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";

import { getSidebarGeneratedAppsAction, type GeneratedAppRecord } from "@/app/ai-template-builder/actions";
import { GeneratedAppIcon } from "@/components/generated-app-icon";

type MenuItem = {
  label: string;
  href: string;
  icon: ElementType;
  iconClassName: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        iconClassName: "text-sky-500",
      },
      {
        label: "AI Assistant",
        href: "/",
        icon: Bot,
        iconClassName: "text-fuchsia-500",
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        iconClassName: "text-emerald-500",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "Kanban / Task",
        href: "/kanban",
        icon: ListTodo,
        iconClassName: "text-amber-500",
      },
      {
        label: "Notes",
        href: "/notes",
        icon: NotebookPen,
        iconClassName: "text-rose-500",
      },
      {
        label: "Whiteboard",
        href: "/whiteboard",
        icon: Workflow,
        iconClassName: "text-cyan-500",
      },
      {
        label: "Pages / Spaces",
        href: "/spaces",
        icon: FileStack,
        iconClassName: "text-indigo-500",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        label: "AI Template Builder",
        href: "/ai-template-builder",
        icon: WandSparkles,
        iconClassName: "text-violet-500",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/",
        icon: Settings2,
        iconClassName: "text-teal-500",
      },
    ],
  },
];

function SidebarItem({
  collapsed,
  item,
}: {
  collapsed: boolean;
  item: MenuItem;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active =
    item.href === "/"
      ? pathname === "/" && item.label === "Dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={`group flex h-7 w-full items-center rounded-md border text-[12px] transition ${
        collapsed ? "justify-center px-0" : "justify-center px-0 sm:justify-start sm:gap-2 sm:px-2"
      } ${
        active
          ? "border-sky-200 bg-white text-slate-950 shadow-sm shadow-sky-100/80"
          : "border-transparent text-slate-600 hover:border-white/70 hover:bg-white/75 hover:text-slate-950"
      }`}
      href={item.href}
      title={item.label}
    >
      <Icon
        aria-hidden="true"
        className={`size-3.5 shrink-0 transition group-hover:scale-105 ${item.iconClassName}`}
      />
      {!collapsed && <span className="hidden truncate sm:block">{item.label}</span>}
    </Link>
  );
}

function GeneratedSidebarItem({
  app,
  collapsed,
}: {
  app: GeneratedAppRecord;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const href = `/ai-template-builder/${app.id}`;
  const active = pathname === href;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={app.appName}
      className={`group flex h-7 w-full items-center rounded-md border text-[12px] transition ${
        collapsed ? "justify-center px-0" : "justify-center px-0 sm:justify-start sm:gap-2 sm:px-2"
      } ${
        active
          ? "border-sky-200 bg-white text-slate-950 shadow-sm shadow-sky-100/80"
          : "border-transparent text-slate-600 hover:border-white/70 hover:bg-white/75 hover:text-slate-950"
      }`}
      href={href}
      title={app.appName}
    >
      <span className="grid size-4 shrink-0 place-items-center rounded" style={{ color: app.color }}>
        <GeneratedAppIcon className="size-3.5 transition group-hover:scale-105" name={app.icon} />
      </span>
      {!collapsed && <span className="hidden truncate sm:block">{app.appName}</span>}
    </Link>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [generatedApps, setGeneratedApps] = useState<GeneratedAppRecord[]>([]);

  useEffect(() => {
    let active = true;

    async function loadGeneratedApps() {
      try {
        const apps = await getSidebarGeneratedAppsAction();
        if (active) setGeneratedApps(apps);
      } catch {
        if (active) setGeneratedApps([]);
      }
    }

    void loadGeneratedApps();
    window.addEventListener("generated-apps-sidebar-changed", loadGeneratedApps);
    return () => {
      active = false;
      window.removeEventListener("generated-apps-sidebar-changed", loadGeneratedApps);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.13),_transparent_25%)]">
        <aside
          className={`flex h-screen min-h-0 shrink-0 flex-col border-r border-white/75 bg-[color:var(--sidebar)] px-2.5 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-[width] duration-300 ${
            collapsed ? "w-[72px]" : "w-[72px] sm:w-[218px]"
          }`}
        >
          <div
            className={`flex h-11 items-center rounded-lg border border-cyan-100/90 bg-white/80 ${
              collapsed ? "justify-center" : "gap-2 px-2"
            }`}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-white shadow-sm shadow-cyan-200">
              <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
            </div>
            {!collapsed && (
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-950">Flowbase</p>
                <p className="truncate text-[11px] text-slate-500">Mindful workspace</p>
              </div>
            )}
          </div>

          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={`mt-1.5 flex h-7 items-center rounded-md border border-transparent text-slate-500 transition hover:border-white hover:bg-white/80 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              collapsed ? "justify-center" : "justify-between px-2"
            }`}
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {!collapsed && (
              <span className="hidden text-[11px] font-medium uppercase text-slate-400 sm:block">
                Menu
              </span>
            )}
            {collapsed ? (
              <ChevronRight aria-hidden="true" className="size-4" />
            ) : (
              <ChevronLeft aria-hidden="true" className="size-4" />
            )}
          </button>

          <nav aria-label="Primary" className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden pb-1">
            {menuGroups.map((group) => (
              <section aria-label={group.label} key={group.label}>
                {!collapsed && (
                  <p className="hidden px-2 text-[8px] font-bold uppercase leading-4 text-cyan-700/70 sm:block">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarItem collapsed={collapsed} item={item} key={item.label} />
                  ))}
                </div>
              </section>
            ))}
            {generatedApps.length > 0 && (
              <section aria-label="Generated Apps">
                {!collapsed && (
                  <p className="hidden px-2 text-[8px] font-bold uppercase leading-4 text-cyan-700/70 sm:block">
                    Generated Apps
                  </p>
                )}
                <div className="space-y-0.5">
                  {generatedApps.map((app) => (
                    <GeneratedSidebarItem app={app} collapsed={collapsed} key={app.id} />
                  ))}
                </div>
              </section>
            )}
          </nav>

          <footer className="space-y-1 border-t border-cyan-100/90 pt-2">
            <div
              className={`flex min-h-11 items-center rounded-lg border border-cyan-100/90 bg-white/80 ${
                collapsed ? "justify-center" : "gap-2 px-2"
              }`}
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-rose-100 text-xs font-bold text-rose-600">
                FL
              </div>
              {!collapsed && (
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-xs font-semibold text-slate-900">Flow Lab</p>
                  <p className="truncate text-[11px] text-slate-500">4 collaborators online</p>
                </div>
              )}
            </div>
            <div
              aria-label={collapsed ? "Workspace is synced" : undefined}
              className={`flex h-7 w-full items-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 ${
                collapsed ? "justify-center" : "justify-between px-2"
              }`}
              title={collapsed ? "Workspace is synced" : undefined}
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              {!collapsed && <span className="hidden text-[11px] font-medium sm:block">Workspace synced</span>}
            </div>
          </footer>
        </aside>

        <section className="h-screen min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {children}
        </section>
      </div>
    </main>
  );
}
