"use client";

import {
  Archive,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Folder,
  Grid2X2,
  List,
  MoreHorizontal,
  MoveRight,
  Palette,
  Pencil,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import {
  createPageAction,
  createSpaceAction,
  deletePageAction,
  deleteSpaceAction,
  duplicatePageAction,
  duplicateSpaceAction,
  getPagesForSpaceAction,
  updatePageAction,
  updateSpaceAction,
  type PageRecord,
  type PageTemplate,
  type SpaceRecord,
} from "./actions";

type FilterTab = "All Spaces" | "Favorites" | "Recently Opened" | "Archived";
type SortMode = "Recently Updated" | "Name" | "Most Pages" | "Favorites";
type ViewMode = "grid" | "list";

const tabs: FilterTab[] = ["All Spaces", "Favorites", "Recently Opened", "Archived"];
const sortModes: SortMode[] = ["Recently Updated", "Name", "Most Pages", "Favorites"];
const spaceColors = ["#8b5cf6", "#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#2dd4bf"];
const templates: PageTemplate[] = ["Blank Page", "Project Plan", "Meeting Notes", "PRD", "Research Notes", "Task Plan"];
const emojiOptions = ["doc", "plan", "notes", "prd", "research", "task"];

function formatUpdatedAt(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "Updated just now";
  if (diff < hour) return `Updated ${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `Updated ${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return "Updated yesterday";
  if (diff < day * 7) return `Updated ${Math.floor(diff / day)} days ago`;
  return "Updated last week";
}

function shortUpdatedAt(value: string) {
  return formatUpdatedAt(value).replace("Updated ", "").replace("just now", "Just now");
}

function emojiLabel(value: string) {
  const labels: Record<string, string> = {
    doc: "Doc",
    plan: "Plan",
    notes: "Notes",
    prd: "PRD",
    research: "Research",
    task: "Task",
  };
  return labels[value] ?? value;
}

function ModalShell({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
      <div className="modal-panel w-full max-w-lg rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <button
            aria-label="Close"
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-violet-200 bg-white/70 p-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-violet-50 text-violet-600">
          <Folder aria-hidden="true" className="size-6" />
        </div>
        <h2 className="mt-3 text-base font-semibold text-slate-950">No spaces found</h2>
        <button
          className="pressable mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
          onClick={onCreate}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          New Space
        </button>
      </div>
    </div>
  );
}

export function SpacesWorkspace({ initialSpaces }: { initialSpaces: SpaceRecord[] }) {
  const [spaces, setSpaces] = useState(initialSpaces);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All Spaces");
  const [sortMode, setSortMode] = useState<SortMode>("Recently Updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [openSpaceMenuId, setOpenSpaceMenuId] = useState<number | null>(null);
  const [openPageMenuId, setOpenPageMenuId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;

  const visibleSpaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spaces
      .filter((space) => {
        if (activeTab === "Archived") return space.archived;
        if (space.archived) return false;
        if (activeTab === "Favorites") return space.favorite;
        if (activeTab === "Recently Opened") {
          return Date.now() - new Date(space.lastOpenedAt).getTime() < 1000 * 60 * 60 * 24 * 7;
        }
        return true;
      })
      .filter((space) => {
        if (!query) return true;
        return (
          space.name.toLowerCase().includes(query) ||
          space.description.toLowerCase().includes(query) ||
          space.pageNames.some((page) => page.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortMode === "Name") return a.name.localeCompare(b.name);
        if (sortMode === "Most Pages") return b.pageCount - a.pageCount;
        if (sortMode === "Favorites") return Number(b.favorite) - Number(a.favorite);
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [activeTab, search, sortMode, spaces]);

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2600);
  }

  function replaceSpace(space: SpaceRecord) {
    setSpaces((current) => current.map((item) => (item.id === space.id ? space : item)));
  }

  function openSpace(space: SpaceRecord) {
    startTransition(async () => {
      try {
        const loadedPages = await getPagesForSpaceAction(space.id);
        setSelectedSpaceId(space.id);
        setPages(loadedPages);
        setSelectedPageId(null);
        setOpenSpaceMenuId(null);
        replaceSpace({ ...space, lastOpenedAt: new Date().toISOString() });
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not open space.");
      }
    });
  }

  function backToSpaces() {
    setSelectedSpaceId(null);
    setPages([]);
    setSelectedPageId(null);
    setOpenPageMenuId(null);
  }

  function createSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const space = await createSpaceAction({
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          color: String(form.get("color") ?? ""),
        });
        setSpaces((current) => [space, ...current]);
        setSpaceModalOpen(false);
        showFeedback("Space created.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not create space.");
      }
    });
  }

  function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const page = await createPageAction({
          spaceId: selectedSpace.id,
          name: String(form.get("name") ?? ""),
          emoji: String(form.get("emoji") ?? "doc"),
          template: String(form.get("template") ?? "Blank Page"),
        });
        setPages((current) => [page, ...current]);
        setSelectedPageId(page.id);
        replaceSpace({ ...selectedSpace, pageCount: selectedSpace.pageCount + 1, updatedAt: new Date().toISOString() });
        setPageModalOpen(false);
        showFeedback("Page created.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not create page.");
      }
    });
  }

  function renameSpace(space: SpaceRecord) {
    const name = window.prompt("Rename Space", space.name)?.trim();
    if (!name) return setOpenSpaceMenuId(null);
    startTransition(async () => {
      try {
        const updated = await updateSpaceAction(space.id, { name });
        replaceSpace(updated);
        showFeedback("Space renamed.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not rename space.");
      }
    });
    setOpenSpaceMenuId(null);
  }

  function changeSpaceColor(space: SpaceRecord, color: string) {
    startTransition(async () => {
      try {
        replaceSpace(await updateSpaceAction(space.id, { color }));
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not change color.");
      }
    });
  }

  function toggleSpaceFavorite(space: SpaceRecord) {
    startTransition(async () => {
      try {
        replaceSpace(await updateSpaceAction(space.id, { favorite: !space.favorite }));
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not update favorite.");
      }
    });
  }

  function archiveSpace(space: SpaceRecord) {
    startTransition(async () => {
      try {
        replaceSpace(await updateSpaceAction(space.id, { archived: !space.archived }));
        showFeedback(space.archived ? "Space restored." : "Space archived.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not archive space.");
      }
    });
    setOpenSpaceMenuId(null);
  }

  function duplicateSpace(space: SpaceRecord) {
    startTransition(async () => {
      try {
        const copy = await duplicateSpaceAction(space.id);
        setSpaces((current) => [copy, ...current]);
        showFeedback("Space duplicated.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not duplicate space.");
      }
    });
    setOpenSpaceMenuId(null);
  }

  function deleteSpace(space: SpaceRecord) {
    if (!window.confirm(`Delete "${space.name}"?`)) return setOpenSpaceMenuId(null);
    startTransition(async () => {
      try {
        await deleteSpaceAction(space.id);
        setSpaces((current) => current.filter((item) => item.id !== space.id));
        if (selectedSpaceId === space.id) backToSpaces();
        showFeedback("Space deleted.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not delete space.");
      }
    });
    setOpenSpaceMenuId(null);
  }

  function renamePage(page: PageRecord) {
    const name = window.prompt("Rename Page", page.name)?.trim();
    if (!name) return setOpenPageMenuId(null);
    startTransition(async () => {
      try {
        const updated = await updatePageAction(page.id, { name });
        setPages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        showFeedback("Page renamed.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not rename page.");
      }
    });
    setOpenPageMenuId(null);
  }

  function togglePageFavorite(page: PageRecord) {
    startTransition(async () => {
      try {
        const updated = await updatePageAction(page.id, { favorite: !page.favorite });
        setPages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not update favorite.");
      }
    });
  }

  function archivePage(page: PageRecord) {
    startTransition(async () => {
      try {
        const updated = await updatePageAction(page.id, { archived: true });
        setPages((current) => current.filter((item) => item.id !== updated.id));
        setSelectedPageId((current) => (current === updated.id ? null : current));
        if (selectedSpace) replaceSpace({ ...selectedSpace, pageCount: Math.max(0, selectedSpace.pageCount - 1) });
        showFeedback("Page archived.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not archive page.");
      }
    });
    setOpenPageMenuId(null);
  }

  function duplicatePage(page: PageRecord) {
    startTransition(async () => {
      try {
        const copy = await duplicatePageAction(page.id);
        setPages((current) => [copy, ...current]);
        setSelectedPageId(copy.id);
        if (selectedSpace) replaceSpace({ ...selectedSpace, pageCount: selectedSpace.pageCount + 1 });
        showFeedback("Page duplicated.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not duplicate page.");
      }
    });
    setOpenPageMenuId(null);
  }

  function deletePage(page: PageRecord) {
    if (!window.confirm(`Delete "${page.name}"?`)) return setOpenPageMenuId(null);
    startTransition(async () => {
      try {
        await deletePageAction(page.id);
        setPages((current) => current.filter((item) => item.id !== page.id));
        setSelectedPageId((current) => (current === page.id ? null : current));
        if (selectedSpace) replaceSpace({ ...selectedSpace, pageCount: Math.max(0, selectedSpace.pageCount - 1) });
        showFeedback("Page deleted.");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "Could not delete page.");
      }
    });
    setOpenPageMenuId(null);
  }

  if (selectedSpace) {
    return (
      <div className="min-h-[calc(100vh-2rem)] space-y-4">
        <header className="panel-enter ui-card p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <button className="font-medium text-violet-600 transition hover:text-violet-700" onClick={backToSpaces} type="button">
              All Spaces
            </button>
            <ChevronRight aria-hidden="true" className="size-4" />
            <span className="font-medium text-slate-800">{selectedSpace.name}</span>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: selectedSpace.color }}>
                  <Folder aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold text-slate-950">{selectedSpace.name}</h1>
                  <p className="mt-0.5 text-sm text-slate-500">{pages.length} Pages</p>
                </div>
              </div>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={isPending}
              onClick={() => setPageModalOpen(true)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              New Page
            </button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="overflow-visible rounded-lg border border-white/80 bg-white/88 shadow-sm shadow-slate-200/60">
            <div className="grid min-w-[720px] grid-cols-[minmax(240px,1fr)_160px_140px_110px_92px_48px] border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-400">
              <span>Page Name</span>
              <span>Type / Template</span>
              <span>Last Updated</span>
              <span>Updated By</span>
              <span>Favorite</span>
              <span />
            </div>
            <div className={`overflow-x-auto ${openPageMenuId ? "pb-64" : ""}`}>
              <div className="min-w-[720px] divide-y divide-slate-100">
                {pages.map((page) => (
                  <div
                    className={`grid grid-cols-[minmax(240px,1fr)_160px_140px_110px_92px_48px] items-center px-4 py-3 transition ${
                      selectedPageId === page.id ? "bg-violet-50/70" : "hover:bg-slate-50"
                    }`}
                    key={page.id}
                  >
                    <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => setSelectedPageId(page.id)} type="button">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-violet-50 text-xs font-bold text-violet-600">
                        {emojiLabel(page.emoji)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{page.name}</span>
                        <span className="block truncate text-xs text-slate-500">{page.description}</span>
                      </span>
                    </button>
                    <span className="w-fit rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{page.type}</span>
                    <span className="text-sm text-slate-500">{shortUpdatedAt(page.updatedAt)}</span>
                    <span className="text-sm font-medium text-slate-700">{page.updatedBy}</span>
                    <button
                      aria-label={page.favorite ? "Unfavorite page" : "Favorite page"}
                      className="grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-amber-50 hover:text-amber-500"
                      onClick={() => togglePageFavorite(page)}
                      type="button"
                    >
                      <Star aria-hidden="true" className={`size-4 ${page.favorite ? "fill-amber-300 text-amber-400" : ""}`} />
                    </button>
                    <div className="relative">
                      <button
                        aria-label={`Actions for ${page.name}`}
                        className="grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => setOpenPageMenuId((current) => (current === page.id ? null : page.id))}
                        type="button"
                      >
                        <MoreHorizontal aria-hidden="true" className="size-4" />
                      </button>
                      {openPageMenuId === page.id && (
                        <div className="absolute right-0 top-9 z-30 w-52 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                          <button className="note-menu-item" onClick={() => renamePage(page)} type="button"><Pencil className="size-4" /> Rename</button>
                          <button className="note-menu-item opacity-55" disabled type="button"><MoveRight className="size-4" /> Move</button>
                          <button className="note-menu-item" onClick={() => duplicatePage(page)} type="button"><Copy className="size-4" /> Duplicate</button>
                          <button className="note-menu-item" onClick={() => togglePageFavorite(page)} type="button"><Star className="size-4" /> Favorite</button>
                          <button className="note-menu-item opacity-55" disabled type="button"><Share2 className="size-4" /> Share</button>
                          <button className="note-menu-item opacity-55" disabled type="button"><Download className="size-4" /> Export</button>
                          <button className="note-menu-item" onClick={() => archivePage(page)} type="button"><Archive className="size-4" /> Archive</button>
                          <button className="note-menu-item text-rose-600 hover:bg-rose-50" onClick={() => deletePage(page)} type="button"><Trash2 className="size-4" /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {pages.length === 0 && (
                  <div className="grid min-h-64 place-items-center text-center">
                    <div>
                      <FileText aria-hidden="true" className="mx-auto size-8 text-violet-300" />
                      <p className="mt-3 text-sm font-medium text-slate-700">No pages in this space</p>
                      <button className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" onClick={() => setPageModalOpen(true)} type="button">
                        Create Page
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-white/80 bg-white/88 p-4 shadow-sm shadow-slate-200/60">
            {selectedPage ? (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-violet-600">Page Preview</p>
                    <h2 className="mt-2 truncate text-xl font-semibold text-slate-950">{selectedPage.name}</h2>
                  </div>
                  <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">{selectedPage.type}</span>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="leading-6 text-slate-600">{selectedPage.description}</p>
                  <div className="rounded-md border border-violet-100 bg-violet-50/60 p-3">
                    <p className="text-xs font-semibold uppercase text-violet-500">Space</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedSpace.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-100 p-3">
                      <p className="text-lg font-semibold text-slate-950">{selectedPage.commentsCount}</p>
                      <p className="text-xs text-slate-500">Comments</p>
                    </div>
                    <div className="rounded-md border border-slate-100 p-3">
                      <p className="text-lg font-semibold text-slate-950">{selectedPage.linkedTasksCount}</p>
                      <p className="text-xs text-slate-500">Linked tasks</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Last edited by <span className="font-semibold text-slate-700">{selectedPage.updatedBy}</span></p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <FileText aria-hidden="true" className="mx-auto size-8 text-violet-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Select a page for preview</p>
                </div>
              </div>
            )}
          </aside>
        </div>

        {pageModalOpen && (
          <ModalShell onClose={() => setPageModalOpen(false)} title="Create New Page">
            <form className="mt-4 space-y-4" onSubmit={createPage}>
              <label className="block text-sm font-medium text-slate-700">Page Name<input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" name="name" required /></label>
              <label className="block text-sm font-medium text-slate-700">Emoji selector<select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-violet-400" name="emoji">{emojiOptions.map((item) => <option key={item} value={item}>{emojiLabel(item)}</option>)}</select></label>
              <label className="block text-sm font-medium text-slate-700">Template<select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-violet-400" name="template">{templates.map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-950 text-sm font-medium text-white" disabled={isPending} type="submit">Create Page</button>
            </form>
          </ModalShell>
        )}

        {feedback && <p className="toast-pop fixed bottom-4 right-4 z-50 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">{feedback}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] space-y-4">
      <header className="panel-enter ui-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600">{spaces.length} Spaces</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">All Spaces</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-violet-100 bg-white px-3 text-sm text-slate-500 shadow-sm shadow-slate-200/50 sm:w-72">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <input className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search spaces or pages." value={search} />
            </label>
            <button className="pressable inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800" disabled={isPending} onClick={() => setSpaceModalOpen(true)} type="button">
              <Plus aria-hidden="true" className="size-4" />
              New Space
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button className={`pressable h-9 rounded-md px-3 text-sm font-medium transition ${activeTab === tab ? "selected-glow bg-violet-100 text-violet-700" : "bg-white text-slate-500 hover:text-slate-900"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 rounded-md border border-slate-200 bg-white p-1">
              <button aria-label="Grid view" className={`pressable grid size-7 place-items-center rounded ${viewMode === "grid" ? "bg-violet-100 text-violet-700" : "text-slate-500"}`} onClick={() => setViewMode("grid")} type="button"><Grid2X2 className="size-4" /></button>
              <button aria-label="List view" className={`pressable grid size-7 place-items-center rounded ${viewMode === "list" ? "bg-violet-100 text-violet-700" : "text-slate-500"}`} onClick={() => setViewMode("list")} type="button"><List className="size-4" /></button>
            </div>
            <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-violet-400" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
              {sortModes.map((mode) => <option key={mode}>{mode}</option>)}
            </select>
          </div>
        </div>
      </header>

      {visibleSpaces.length === 0 ? (
        <EmptyState onCreate={() => setSpaceModalOpen(true)} />
      ) : (
        <section className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {visibleSpaces.map((space) => (
            <article className={`group relative ui-card ui-card-hover p-4 ${viewMode === "list" ? "flex flex-col gap-3 md:flex-row md:items-center md:justify-between" : ""}`} key={space.id}>
              <button className="absolute right-12 top-4 grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-amber-50 hover:text-amber-500" onClick={() => toggleSpaceFavorite(space)} type="button" aria-label={space.favorite ? "Unfavorite space" : "Favorite space"}>
                <Star aria-hidden="true" className={`size-4 ${space.favorite ? "fill-amber-300 text-amber-400" : ""}`} />
              </button>
              <div className="relative">
                <button className="absolute right-0 top-0 grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-800" onClick={() => setOpenSpaceMenuId((current) => (current === space.id ? null : space.id))} type="button" aria-label={`Actions for ${space.name}`}>
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </button>
                {openSpaceMenuId === space.id && (
                  <div className="absolute right-0 top-9 z-30 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                    <button className="note-menu-item" onClick={() => renameSpace(space)} type="button"><Pencil className="size-4" /> Rename Space</button>
                    <div className="px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500"><Palette className="size-3.5" /> Change Color</div>
                      <div className="flex gap-1.5">{spaceColors.map((color) => <button aria-label="Change color" className={`size-5 rounded-full border-2 border-white ring-offset-1 ${space.color === color ? "ring-2 ring-slate-400" : ""}`} key={color} onClick={() => changeSpaceColor(space, color)} style={{ backgroundColor: color }} type="button" />)}</div>
                    </div>
                    <button className="note-menu-item" onClick={() => openSpace(space)} type="button"><Plus className="size-4" /> Add Page</button>
                    <button className="note-menu-item opacity-55" disabled type="button"><UserPlus className="size-4" /> Invite Collaborators</button>
                    <button className="note-menu-item" onClick={() => duplicateSpace(space)} type="button"><Copy className="size-4" /> Duplicate</button>
                    <button className="note-menu-item" onClick={() => archiveSpace(space)} type="button"><Archive className="size-4" /> {space.archived ? "Restore" : "Archive"}</button>
                    <button className="note-menu-item text-rose-600 hover:bg-rose-50" onClick={() => deleteSpace(space)} type="button"><Trash2 className="size-4" /> Delete</button>
                  </div>
                )}
              </div>
              <button className={`block w-full min-w-0 pr-16 text-left ${viewMode === "list" ? "md:flex md:items-center md:gap-4" : ""}`} onClick={() => openSpace(space)} type="button">
                <span className="grid size-12 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: space.color }}>
                  <Folder aria-hidden="true" className="size-6" />
                </span>
                <span className="mt-4 block min-w-0 md:mt-0">
                  <span className="block truncate text-base font-semibold text-slate-950">{space.name}</span>
                  <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-500">{space.description}</span>
                </span>
              </button>
              <div className={`mt-5 flex items-center justify-between gap-3 ${viewMode === "list" ? "md:mt-0 md:min-w-80" : ""}`}>
                <div className="flex -space-x-2">
                  {space.members.slice(0, 3).map((member) => (
                    <span className="grid size-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white" key={member.email} style={{ backgroundColor: member.color }} title={member.email}>
                      {member.initials}
                    </span>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">{space.pageCount} Pages</p>
                  <p className="text-xs text-slate-500">{formatUpdatedAt(space.updatedAt)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {spaceModalOpen && (
        <ModalShell onClose={() => setSpaceModalOpen(false)} title="Create New Space">
          <form className="mt-4 space-y-4" onSubmit={createSpace}>
            <label className="block text-sm font-medium text-slate-700">Space Name<input className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" name="name" required /></label>
            <label className="block text-sm font-medium text-slate-700">Description<textarea className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" name="description" /></label>
            <div>
              <p className="text-sm font-medium text-slate-700">Color selector</p>
              <div className="mt-2 flex gap-2">{spaceColors.map((color, index) => <label className="grid size-8 place-items-center" key={color}><input className="peer sr-only" defaultChecked={index === 0} name="color" type="radio" value={color} /><span className="size-7 rounded-full border-2 border-white ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-400" style={{ backgroundColor: color }} /></label>)}</div>
            </div>
            <button className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-950 text-sm font-medium text-white" disabled={isPending} type="submit">Create Space</button>
          </form>
        </ModalShell>
      )}

      {feedback && <p className="toast-pop fixed bottom-4 right-4 z-50 rounded-lg bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">{feedback}</p>}
    </div>
  );
}
