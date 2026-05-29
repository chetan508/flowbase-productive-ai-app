"use client";

import dynamic from "next/dynamic";
import {
  Bot,
  CheckCircle2,
  Download,
  Eraser,
  FilePlus2,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import {
  createWhiteboardAction,
  deleteWhiteboardAction,
  renameWhiteboardAction,
  saveWhiteboardSceneAction,
  type WhiteboardRecord,
} from "./actions";

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[420px] place-items-center bg-white text-sm text-slate-500">
        <div className="skeleton-shimmer rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3">Loading canvas...</div>
      </div>
    ),
  },
);

type SaveStatus = "saved" | "saving" | "dirty" | "error";
type DiagramKind = "flow" | "mind" | "architecture" | "journey";

type DiagramNode = {
  title: string;
  detail?: string;
};

const boardColors = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#2dd4bf"];
const backgroundColors = ["transparent", "#e0f2fe", "#dcfce7", "#fef3c7", "#ffe4e6", "#ede9fe"];
const defaultStickyColor = "#fef3c7";

function formatUpdatedAt(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function safeFilename(name: string) {
  return name.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "whiteboard";
}

function centerPoint(api: ExcalidrawApi | null) {
  const appState = api?.getAppState?.();
  return {
    x: -Number(appState?.scrollX ?? 0) + 180,
    y: -Number(appState?.scrollY ?? 0) + 120,
  };
}

function splitPrompt(prompt: string) {
  const cleaned = prompt
    .replace(/\b(flowchart|mind map|architecture|journey|process|diagram|system|user)\b/gi, " ")
    .split(/[,;>\n]|(?:\s+to\s+)|(?:\s+then\s+)|(?:\s+and\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const fallback = ["Discover", "Shape", "Review", "Launch"];
  return (cleaned.length >= 3 ? cleaned : fallback).slice(0, 7);
}

function diagramKind(prompt: string): DiagramKind {
  const lower = prompt.toLowerCase();
  if (/mind|brainstorm|map/.test(lower)) return "mind";
  if (/architecture|system|service|api|database|infra|cloud/.test(lower)) return "architecture";
  if (/journey|persona|customer|user/.test(lower)) return "journey";
  return "flow";
}

function nodeLabel(title: string, detail?: string) {
  return detail ? `${title}\n${detail}` : title;
}

function createBox(id: string, x: number, y: number, width: number, height: number, text: string, color: string) {
  return {
    id,
    type: "rectangle",
    x,
    y,
    width,
    height,
    strokeColor: "#334155",
    backgroundColor: color,
    fillStyle: "solid",
    roughness: 1,
    roundness: { type: 3 },
    label: {
      text,
      fontSize: 18,
      strokeColor: "#0f172a",
      textAlign: "center",
      verticalAlign: "middle",
    },
  };
}

function createArrow(x: number, y: number, width: number, height: number) {
  return {
    type: "arrow",
    x,
    y,
    width,
    height,
    points: [
      [0, 0],
      [width, height],
    ],
    strokeColor: "#475569",
    endArrowhead: "arrow",
    roundness: { type: 2 },
  };
}

function buildFlowDiagram(nodes: DiagramNode[], origin: { x: number; y: number }) {
  const elements: unknown[] = [];
  nodes.forEach((node, index) => {
    const x = origin.x + index * 230;
    const id = `flow-${Date.now()}-${index}`;
    elements.push(createBox(id, x, origin.y, 170, 86, nodeLabel(node.title, node.detail), backgroundColors[index % backgroundColors.length]));
    if (index < nodes.length - 1) {
      elements.push(createArrow(x + 180, origin.y + 43, 42, 0));
    }
  });
  return elements;
}

function buildMindMap(nodes: DiagramNode[], origin: { x: number; y: number }) {
  const centerId = `mind-center-${Date.now()}`;
  const branches = nodes.slice(1);
  const elements: unknown[] = [
    createBox(centerId, origin.x + 260, origin.y + 120, 190, 96, nodes[0]?.title ?? "Core idea", "#cffafe"),
  ];

  branches.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(branches.length, 1);
    const x = origin.x + 320 + Math.cos(angle) * 310;
    const y = origin.y + 140 + Math.sin(angle) * 190;
    elements.push(createBox(`mind-${Date.now()}-${index}`, x, y, 170, 78, node.title, backgroundColors[(index + 2) % backgroundColors.length]));
    elements.push(createArrow(origin.x + 450, origin.y + 168, x - (origin.x + 450), y + 38 - (origin.y + 168)));
  });

  return elements;
}

function buildArchitectureDiagram(nodes: DiagramNode[], origin: { x: number; y: number }) {
  const labels = nodes.length >= 5 ? nodes : [
    { title: "Client app" },
    { title: "API gateway" },
    { title: "Auth service" },
    { title: "Worker" },
    { title: "Database" },
  ];
  const coords = [
    [origin.x, origin.y + 110],
    [origin.x + 250, origin.y + 110],
    [origin.x + 500, origin.y],
    [origin.x + 500, origin.y + 220],
    [origin.x + 750, origin.y + 110],
  ];

  return labels.slice(0, 5).flatMap((node, index) => {
    const [x, y] = coords[index];
    const items: unknown[] = [
      createBox(`arch-${Date.now()}-${index}`, x, y, 180, 88, node.title, backgroundColors[(index + 1) % backgroundColors.length]),
    ];
    if (index === 0) items.push(createArrow(x + 188, y + 44, 52, 0));
    if (index === 1) {
      items.push(createArrow(x + 188, y + 22, 52, -88));
      items.push(createArrow(x + 188, y + 66, 52, 88));
    }
    if (index === 2) items.push(createArrow(x + 188, y + 44, 52, 110));
    if (index === 3) items.push(createArrow(x + 188, y + 44, 52, -110));
    return items;
  });
}

function buildJourneyDiagram(nodes: DiagramNode[], origin: { x: number; y: number }) {
  const phases = nodes.slice(0, 5);
  return phases.flatMap((node, index) => {
    const x = origin.x + index * 220;
    const color = backgroundColors[(index + 3) % backgroundColors.length] || defaultStickyColor;
    const items: unknown[] = [
      createBox(`journey-${Date.now()}-${index}`, x, origin.y, 170, 120, node.title, color),
      {
        type: "text",
        x: x + 12,
        y: origin.y + 142,
        text: `Phase ${index + 1}`,
        fontSize: 18,
        strokeColor: "#64748b",
      },
    ];
    if (index < phases.length - 1) items.push(createArrow(x + 180, origin.y + 60, 34, 0));
    return items;
  });
}

function createDiagram(prompt: string, origin: { x: number; y: number }) {
  const titles = splitPrompt(prompt).map((title) => ({ title }));
  const kind = diagramKind(prompt);

  if (kind === "mind") return buildMindMap(titles, origin);
  if (kind === "architecture") return buildArchitectureDiagram(titles, origin);
  if (kind === "journey") return buildJourneyDiagram(titles, origin);
  return buildFlowDiagram(titles, origin);
}

type ExcalidrawApi = {
  updateScene: (sceneData: { elements?: readonly unknown[]; appState?: Record<string, unknown>; captureUpdate?: unknown }) => void;
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
  scrollToContent?: (elements?: readonly unknown[], opts?: Record<string, unknown>) => void;
  setActiveTool?: (tool: { type: string; locked?: boolean; insertOnCanvasDirectly?: boolean }) => void;
};

const ExcalidrawCanvas = memo(
  function ExcalidrawCanvas({
    board,
    onApi,
    onChange,
  }: {
    board: WhiteboardRecord;
    onApi: (api: ExcalidrawApi) => void;
    onChange: (elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => void;
  }) {
    return (
      <Excalidraw
        excalidrawAPI={(api) => onApi(api as ExcalidrawApi)}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            showWelcomeScreen: false,
            ...board.scene.appState,
          },
          elements: board.scene.elements as never[],
          files: board.scene.files as never,
        }}
        name={board.name}
        onChange={onChange as never}
        theme="light"
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          welcomeScreen: false,
        }}
      />
    );
  },
  (previous, next) => previous.board.id === next.board.id,
);

ExcalidrawCanvas.displayName = "ExcalidrawCanvas";

export function WhiteboardWorkspace({ initialWhiteboards }: { initialWhiteboards: WhiteboardRecord[] }) {
  const [whiteboards, setWhiteboards] = useState(initialWhiteboards);
  const [selectedId, setSelectedId] = useState(initialWhiteboards[0]?.id ?? 0);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasSceneContent, setHasSceneContent] = useState(() => (initialWhiteboards[0]?.scene.elements.length ?? 0) > 0);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [diagramPrompt, setDiagramPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const latestSceneRef = useRef<WhiteboardRecord["scene"] | null>(null);

  const selectedBoard = useMemo(
    () => whiteboards.find((board) => board.id === selectedId) ?? whiteboards[0] ?? null,
    [selectedId, whiteboards],
  );

  useEffect(() => {
    if (selectedBoard && selectedBoard.id !== selectedId) {
      setSelectedId(selectedBoard.id);
    }
  }, [selectedBoard, selectedId]);

  useEffect(() => {
    setHasSceneContent((selectedBoard?.scene.elements.length ?? 0) > 0);
  }, [selectedBoard?.id, selectedBoard?.scene.elements.length]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function replaceBoard(board: WhiteboardRecord) {
    setWhiteboards((current) => current.map((item) => (item.id === board.id ? board : item)));
  }

  function addWhiteboard() {
    startTransition(async () => {
      try {
        const board = await createWhiteboardAction({ name: "Untitled whiteboard", color: boardColors[whiteboards.length % boardColors.length] });
        setWhiteboards((current) => [board, ...current]);
        setSelectedId(board.id);
        setFeedback("Whiteboard created.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Could not create whiteboard.");
      }
    });
  }

  function renameWhiteboard(board: WhiteboardRecord) {
    const name = window.prompt("Rename whiteboard", board.name)?.trim();
    if (!name) {
      setOpenMenuId(null);
      return;
    }

    startTransition(async () => {
      try {
        const updated = await renameWhiteboardAction(board.id, name);
        replaceBoard(updated);
        setFeedback("Whiteboard renamed.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Could not rename whiteboard.");
      }
    });
    setOpenMenuId(null);
  }

  function deleteWhiteboard(board: WhiteboardRecord) {
    if (!window.confirm(`Delete "${board.name}"?`)) {
      setOpenMenuId(null);
      return;
    }

    startTransition(async () => {
      try {
        const nextBoards = await deleteWhiteboardAction(board.id);
        setWhiteboards(nextBoards);
        setSelectedId(nextBoards[0]?.id ?? 0);
        setFeedback("Whiteboard deleted.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Could not delete whiteboard.");
      }
    });
    setOpenMenuId(null);
  }

  function scheduleSave(boardId: number, scene: WhiteboardRecord["scene"]) {
    latestSceneRef.current = scene;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("dirty");
    saveTimerRef.current = window.setTimeout(() => {
      setSaveStatus("saving");
      startTransition(async () => {
        try {
          const updated = await saveWhiteboardSceneAction(boardId, latestSceneRef.current ?? scene);
          replaceBoard(updated);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      });
    }, 900);
  }

  function handleSceneChange(elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) {
    if (!selectedBoard) return;
    const nextHasSceneContent = elements.length > 0;

    const scene = {
      elements: [...elements],
      appState: {
        currentItemBackgroundColor: appState.currentItemBackgroundColor,
        currentItemStrokeColor: appState.currentItemStrokeColor,
        currentItemFontSize: appState.currentItemFontSize,
        exportBackground: appState.exportBackground,
        exportScale: appState.exportScale,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        viewBackgroundColor: appState.viewBackgroundColor,
        zoom: appState.zoom,
      },
      files: { ...files },
    };

    setHasSceneContent((current) => (current === nextHasSceneContent ? current : nextHasSceneContent));
    scheduleSave(selectedBoard.id, scene);
  }

  async function addConvertedElements(skeleton: unknown[]) {
    if (!apiRef.current || skeleton.length === 0) return;

    const { CaptureUpdateAction, convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
    const elements = convertToExcalidrawElements(skeleton as never[], { regenerateIds: true });
    apiRef.current.updateScene({
      elements: [...apiRef.current.getSceneElements(), ...elements],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    apiRef.current.scrollToContent?.(elements, { fitToContent: true });
  }

  async function insertStickyNote() {
    const origin = centerPoint(apiRef.current);
    await addConvertedElements([
      createBox(`sticky-${Date.now()}`, origin.x, origin.y, 190, 150, "New note", defaultStickyColor),
    ]);
    setHasSceneContent(true);
    setFeedback("Sticky note added.");
  }

  async function generateDiagram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = diagramPrompt.trim();
    if (!prompt) return;

    await addConvertedElements(createDiagram(prompt, centerPoint(apiRef.current)));
    setHasSceneContent(true);
    setDiagramPrompt("");
    setDiagramOpen(false);
    setFeedback("Diagram added.");
  }

  async function exportPng() {
    if (!apiRef.current || !selectedBoard) return;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: apiRef.current.getSceneElements() as never[],
        appState: {
          ...apiRef.current.getAppState(),
          exportBackground: true,
          viewBackgroundColor: apiRef.current.getAppState().viewBackgroundColor ?? "#ffffff",
        } as never,
        files: apiRef.current.getFiles() as never,
        mimeType: "image/png",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFilename(selectedBoard.name)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback("PNG exported.");
    } catch {
      setFeedback("Export failed.");
    }
  }

  function clearCanvas() {
    if (!window.confirm("Clear this whiteboard canvas?")) return;
    apiRef.current?.updateScene({ elements: [] });
    setHasSceneContent(false);
    setOpenMenuId(null);
  }

  const statusCopy = {
    dirty: "Unsaved",
    error: "Save failed",
    saved: "Saved",
    saving: "Saving...",
  } satisfies Record<SaveStatus, string>;

  return (
    <div className="panel-enter flex h-full min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-white/80 bg-white/70 shadow-sm shadow-slate-200/60 lg:flex-row">
      <aside className="flex max-h-[42vh] min-h-0 w-full shrink-0 flex-col border-b border-cyan-100/80 bg-[color:var(--soft-panel)]/95 lg:max-h-none lg:w-[310px] lg:border-b-0 lg:border-r">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-cyan-700">Whiteboards</p>
              <h1 className="truncate text-xl font-semibold text-slate-950">Visual spaces</h1>
            </div>
            <button
              aria-label="New Whiteboard"
              className="pressable inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-60"
              disabled={isPending}
              onClick={addWhiteboard}
              title="New Whiteboard"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>

          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-100 bg-cyan-50 text-sm font-medium text-cyan-800 transition hover:border-cyan-200 hover:bg-cyan-100"
            disabled={isPending}
            onClick={addWhiteboard}
            type="button"
          >
            <FilePlus2 aria-hidden="true" className="size-4" />
            New Whiteboard
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {whiteboards.map((board) => {
            const active = board.id === selectedBoard?.id;
            return (
              <div className="group relative" key={board.id}>
                <button
                  aria-pressed={active}
                  className={`selectable-motion pressable flex min-h-14 w-full min-w-0 items-center gap-3 rounded-md border p-2.5 text-left transition ${
                    active
                      ? "selected-glow border-cyan-200 bg-white shadow-sm shadow-cyan-100/80"
                      : "border-transparent hover:-translate-y-0.5 hover:border-white hover:bg-white/70"
                  }`}
                  onClick={() => setSelectedId(board.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: board.color }} />
                  <span className="min-w-0 flex-1 pr-7">
                    <span className="block truncate text-sm font-semibold text-slate-900">{board.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{formatUpdatedAt(board.updatedAt)}</span>
                  </span>
                </button>
                <button
                  aria-label={`Actions for ${board.name}`}
                  className="absolute right-2 top-3 grid size-7 place-items-center rounded-md text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-800 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => setOpenMenuId((current) => (current === board.id ? null : board.id))}
                  type="button"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </button>
                {openMenuId === board.id && (
                  <div className="panel-enter absolute right-2 top-11 z-30 w-44 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                    <button className="note-menu-item" onClick={() => renameWhiteboard(board)} type="button">
                      <Pencil aria-hidden="true" className="size-4" /> Rename
                    </button>
                    <button className="note-menu-item text-rose-600 hover:bg-rose-50" onClick={() => deleteWhiteboard(board)} type="button">
                      <Trash2 aria-hidden="true" className="size-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-[58vh] min-w-0 flex-1 flex-col overflow-hidden bg-white lg:min-h-0">
        {selectedBoard ? (
          <>
            <header className="flex min-h-14 shrink-0 flex-col gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-700">
                  <Sparkles aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{selectedBoard.name}</p>
                  <p className="truncate text-xs text-slate-500">{formatUpdatedAt(selectedBoard.updatedAt)}</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
                <button className="whiteboard-action" onClick={() => setDiagramOpen(true)} type="button">
                  <Bot aria-hidden="true" className="size-4 text-violet-500" />
                  AI Diagram
                </button>
                <button className="whiteboard-action" onClick={insertStickyNote} type="button">
                  <StickyNote aria-hidden="true" className="size-4 text-amber-500" />
                  Sticky
                </button>
                <button className="whiteboard-action" onClick={exportPng} type="button">
                  <Download aria-hidden="true" className="size-4 text-emerald-500" />
                  Export PNG
                </button>
                <span
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                    saveStatus === "error"
                      ? "border-rose-100 bg-rose-50 text-rose-700"
                      : saveStatus === "saved"
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-amber-100 bg-amber-50 text-amber-700"
                  }`}
                >
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  {statusCopy[saveStatus]}
                </span>
                <div className="relative">
                  <button
                    aria-label="More options"
                    className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                    onClick={() => setOpenMenuId((current) => (current === -1 ? null : -1))}
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                  </button>
                  {openMenuId === -1 && (
                    <div className="absolute right-0 top-10 z-40 w-44 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/80">
                      <button className="note-menu-item" onClick={clearCanvas} type="button">
                        <Eraser aria-hidden="true" className="size-4" /> Clear canvas
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <ExcalidrawCanvas
                board={selectedBoard}
                key={selectedBoard.id}
                onApi={(api) => {
                  apiRef.current = api;
                }}
                onChange={handleSceneChange}
              />
              {!hasSceneContent && (
                <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-6 pt-24 text-center">
                  <div className="pointer-events-auto w-full max-w-md rounded-lg border border-cyan-100 bg-white/92 p-5 shadow-lg shadow-slate-200/70 backdrop-blur">
                    <div className="mx-auto grid size-11 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
                      <Sparkles aria-hidden="true" className="size-5" />
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-950">Start a fresh board</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Sketch an idea, drop a sticky note, or generate a starter diagram.
                    </p>
                    <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                      <button className="whiteboard-action h-10 bg-slate-950 px-3 text-white hover:bg-slate-800 hover:text-white" onClick={() => setDiagramOpen(true)} type="button">
                        <Bot aria-hidden="true" className="size-4 text-violet-300" />
                        AI Diagram
                      </button>
                      <button className="whiteboard-action h-10 px-3" onClick={insertStickyNote} type="button">
                        <StickyNote aria-hidden="true" className="size-4 text-amber-500" />
                        Sticky
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid h-full min-h-[480px] place-items-center p-6 text-center">
            <div>
              <StickyNote aria-hidden="true" className="mx-auto size-9 text-cyan-500" />
              <p className="mt-3 text-sm font-medium text-slate-700">No whiteboards found</p>
              <button className="mt-3 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" onClick={addWhiteboard} type="button">
                Create whiteboard
              </button>
            </div>
          </div>
        )}
      </section>

      {diagramOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
          <form className="modal-panel w-full max-w-lg rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5" onSubmit={generateDiagram}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-600">AI Diagram</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Generate diagram</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setDiagramOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <label className="mt-4 block text-xs font-medium text-slate-600">
              Prompt
              <textarea
                autoFocus
                className="mt-1 min-h-32 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setDiagramPrompt(event.target.value)}
                placeholder="Create a system architecture diagram for client app, API gateway, auth, workers, and database"
                required
                value={diagramPrompt}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              {["Flowchart", "Mind map", "System architecture", "User journey", "Process"].map((item) => (
                <button
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 transition hover:bg-white hover:text-slate-800"
                  key={item}
                  onClick={() => setDiagramPrompt((current) => `${item}: ${current}`.trim())}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setDiagramOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800" type="submit">
                <Bot aria-hidden="true" className="size-4 text-violet-300" />
                Generate
              </button>
            </div>
          </form>
        </div>
      )}

      {feedback && (
        <p aria-live="polite" className="toast-pop fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg">
          {feedback}
        </p>
      )}
    </div>
  );
}
