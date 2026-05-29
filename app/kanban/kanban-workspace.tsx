"use client";

import { Composer, Thread } from "@liveblocks/react-ui";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Columns3,
  GripVertical,
  Layers3,
  Link2,
  MessageCircle,
  NotebookPen,
  Palette,
  Pencil,
  Plus,
  Settings2,
  Share2,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  addColumnAction,
  createBoardAction,
  deleteColumnAction,
  deleteTaskAction,
  inviteBoardMemberAction,
  moveTaskAction,
  saveTaskAction,
  updateColumnAction,
} from "@/app/kanban/actions";
import {
  kanbanRoomId,
  type KanbanBoardRecord,
  type KanbanMemberRecord,
  type KanbanTaskRecord,
  type Priority,
} from "@/lib/kanban";
import {
  RoomProvider,
  useOthers,
  useSelf,
  useThreads,
  useUpdateMyPresence,
} from "@/liveblocks.config";

type LabelOption = {
  id: string;
  name: string;
  className: string;
  dotClassName: string;
};

type BoardDialogState = {
  name: string;
  color: string;
};

type TaskDialogState = {
  boardId: number;
  columnId: number;
  task: KanbanTaskRecord | null;
};

type TaskThreadMetadata = {
  boardId?: string | number;
  taskId?: string | number;
};

const maxColumns = 5;

const boardColors = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#2dd4bf",
];

const labelOptions: LabelOption[] = [
  {
    id: "design",
    name: "Design",
    className: "border-rose-100 bg-rose-50 text-rose-700",
    dotClassName: "bg-rose-400",
  },
  {
    id: "work",
    name: "Work",
    className: "border-sky-100 bg-sky-50 text-sky-700",
    dotClassName: "bg-sky-400",
  },
  {
    id: "focus",
    name: "Focus",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-400",
  },
  {
    id: "home",
    name: "Home",
    className: "border-amber-100 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-400",
  },
];

const priorityTone: Record<Priority, string> = {
  Low: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-100 bg-amber-50 text-amber-700",
  High: "border-rose-100 bg-rose-50 text-rose-700",
};

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function totalTasks(board: KanbanBoardRecord) {
  return board.columns.reduce((count, column) => count + column.tasks.length, 0);
}

function labelFor(id: string) {
  return labelOptions.find((label) => label.id === id);
}

function threadBelongsToTask(thread: { metadata: TaskThreadMetadata }, boardId: number, taskId: number) {
  return String(thread.metadata?.boardId) === String(boardId) && String(thread.metadata?.taskId) === String(taskId);
}

export function KanbanWorkspace({ initialBoards }: { initialBoards: KanbanBoardRecord[] }) {
  const [boards, setBoards] = useState(initialBoards);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(initialBoards[0]?.id ?? null);
  const [boardDialog, setBoardDialog] = useState<BoardDialogState | null>(null);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [dropColumnId, setDropColumnId] = useState<number | null>(null);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null,
    [boards, selectedBoardId],
  );

  useEffect(() => {
    if (selectedBoard && selectedBoard.id !== selectedBoardId) {
      setSelectedBoardId(selectedBoard.id);
    }
  }, [selectedBoard, selectedBoardId]);

  useEffect(() => {
    if (feedback) {
      const timer = window.setTimeout(() => setFeedback(null), 2600);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [feedback]);

  function replaceBoard(board: KanbanBoardRecord | null) {
    if (!board) {
      return;
    }

    setBoards((current) => current.map((item) => (item.id === board.id ? board : item)));
  }

  function runBoardMutation(
    action: () => Promise<KanbanBoardRecord | null>,
    message: string,
    options?: { selectBoard?: boolean },
  ) {
    startTransition(async () => {
      try {
        const board = await action();
        if (board) {
          setBoards((current) => {
            const exists = current.some((item) => item.id === board.id);
            return exists ? current.map((item) => (item.id === board.id ? board : item)) : [...current, board];
          });
          if (options?.selectBoard) {
            setSelectedBoardId(board.id);
          }
        }
        setFeedback(message);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function createBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!boardDialog?.name.trim()) {
      return;
    }

    const input = { name: boardDialog.name, color: boardDialog.color };
    setBoardDialog(null);
    runBoardMutation(() => createBoardAction(input), "Board created.", { selectBoard: true });
  }

  function addColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoard || !newColumnName.trim()) {
      return;
    }

    runBoardMutation(() => addColumnAction(selectedBoard.id, newColumnName), "Column added.");
    setNewColumnName("");
  }

  function saveColumnName(columnId: number) {
    if (!selectedBoard || !editingColumnName.trim()) {
      return;
    }

    runBoardMutation(
      () => updateColumnAction(selectedBoard.id, columnId, editingColumnName),
      "Column updated.",
    );
    setEditingColumnId(null);
    setEditingColumnName("");
  }

  function deleteColumn(columnId: number) {
    if (!selectedBoard) {
      return;
    }

    runBoardMutation(() => deleteColumnAction(selectedBoard.id, columnId), "Column deleted.");
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!taskDialog) {
      return;
    }

    const taskInput = {
      id: taskDialog.task?.id,
      boardId: taskDialog.boardId,
      columnId: taskDialog.columnId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? todayKey()),
      priority: String(formData.get("priority") ?? "Medium") as Priority,
      labelIds: formData.getAll("labels").map(String),
      syncCalendar: formData.get("syncCalendar") === "on",
      linkNotes: formData.get("linkNotes") === "on",
    };

    if (!taskInput.title) {
      return;
    }

    setTaskDialog(null);
    runBoardMutation(
      () => saveTaskAction(taskInput),
      taskDialog.task ? "Task updated." : "Task added.",
    );
  }

  function deleteTask(boardId: number, taskId: number) {
    runBoardMutation(() => deleteTaskAction(boardId, taskId), "Task deleted.");
  }

  function moveTask(taskId: number, targetColumnId: number) {
    if (!selectedBoard) {
      return;
    }

    runBoardMutation(() => moveTaskAction(selectedBoard.id, taskId, targetColumnId), "Task moved.");
  }

  function dropTask(event: DragEvent<HTMLElement>, columnId: number) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData("text/kanban-task-id"));
    setDropColumnId(null);

    if (taskId) {
      moveTask(taskId, columnId);
    }
  }

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-border/80 pb-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Task Boards</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-white bg-white/80 px-3 text-sm text-slate-500 shadow-sm shadow-slate-200/60">
            <Layers3 aria-hidden="true" className="size-4 shrink-0 text-cyan-500" />
            <span className="truncate">
              {boards.length} boards · {selectedBoard ? totalTasks(selectedBoard) : 0} tasks
            </span>
          </div>
          <button
            className="pressable inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            onClick={() => setBoardDialog({ name: "", color: boardColors[0] })}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4 text-amber-300" />
            New board
          </button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-104px)] min-w-0 gap-4 py-3 lg:h-[calc(100vh-104px)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-[calc(100vh-104px)] min-h-0 min-w-0 overflow-y-auto rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm shadow-slate-200/60 lg:h-full">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-600">Boards</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">Manage workspaces</h2>
            </div>
            <ClipboardList aria-hidden="true" className="size-4 text-amber-500" />
          </div>

          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cyan-100 bg-cyan-50 text-sm font-medium text-cyan-800 transition hover:border-cyan-200 hover:bg-cyan-100"
            onClick={() => setBoardDialog({ name: "", color: boardColors[0] })}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create Kanban board
          </button>

          <div className="mt-4 space-y-2">
            {boards.map((board) => {
              const active = selectedBoard?.id === board.id;

              return (
                <button
                  aria-pressed={active}
                  className={`selectable-motion pressable flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border px-3 text-left transition ${
                    active
                      ? "selected-glow border-sky-200 bg-white text-slate-950 shadow-sm shadow-sky-100/80"
                      : "border-slate-100 bg-[color:var(--soft-panel)] text-slate-700 hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-white"
                  }`}
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: board.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{board.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {board.columns.length} columns · {totalTasks(board)} tasks
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex h-[calc(100vh-104px)] min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm shadow-slate-200/60 sm:p-4 lg:h-full">
          {selectedBoard ? (
            <RoomProvider
              id={kanbanRoomId(selectedBoard.id)}
              initialPresence={{ activeTaskId: null, cursor: null }}
              key={selectedBoard.id}
            >
              <BoardRoomContent
                board={selectedBoard}
                dropColumnId={dropColumnId}
                editingColumnId={editingColumnId}
                editingColumnName={editingColumnName}
                isPending={isPending}
                newColumnName={newColumnName}
                onAddColumn={addColumn}
                onDeleteColumn={deleteColumn}
                onDeleteTask={deleteTask}
                onDropTask={dropTask}
                onEditColumn={(columnId, name) => {
                  setEditingColumnId(columnId);
                  setEditingColumnName(name);
                }}
                onMoveTask={moveTask}
                onOpenCollaboration={() => setShowCollaboration(true)}
                onOpenTask={setTaskDialog}
                onSaveColumn={saveColumnName}
                onSetDropColumnId={setDropColumnId}
                onSetEditingColumnName={setEditingColumnName}
                onSetNewColumnName={setNewColumnName}
                replaceBoard={replaceBoard}
              />
              {showCollaboration && (
                <CollaborationPanel
                  board={selectedBoard}
                  onClose={() => setShowCollaboration(false)}
                  onFeedback={setFeedback}
                  replaceBoard={replaceBoard}
                />
              )}
              {taskDialog && (
                <TaskDialog
                  columnName={
                    selectedBoard.columns.find((column) => column.id === taskDialog.columnId)?.name ??
                    "Task"
                  }
                  onClose={() => setTaskDialog(null)}
                  onSubmit={saveTask}
                  task={taskDialog.task}
                  boardId={selectedBoard.id}
                />
              )}
            </RoomProvider>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-slate-200 bg-[color:var(--soft-panel)] p-6 text-center">
              <div>
                <Palette aria-hidden="true" className="mx-auto size-8 text-cyan-500" />
                <h2 className="mt-3 text-lg font-semibold text-slate-950">Create your first board</h2>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Add a Kanban board and Flowbase will start it with Todo, In Progress, and Done.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {boardDialog && (
        <div className="modal-backdrop fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
          <form
            className="modal-panel w-full max-w-md rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5"
            onSubmit={createBoard}
          >
            <DialogHeader
              eyebrow="New board"
              onClose={() => setBoardDialog(null)}
              title="Create Kanban board"
            />
            <label className="mt-4 block text-xs font-medium text-slate-600">
              Board name
              <input
                autoFocus
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) =>
                  setBoardDialog((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                placeholder="Product launch"
                required
                value={boardDialog.name}
              />
            </label>
            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-slate-600">Board color</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {boardColors.map((color) => (
                  <label
                    className={`grid size-9 cursor-pointer place-items-center rounded-md border transition ${
                      boardDialog.color === color
                        ? "border-slate-400 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-cyan-200"
                    }`}
                    key={color}
                    title={color}
                  >
                    <input
                      checked={boardDialog.color === color}
                      className="sr-only"
                      name="boardColor"
                      onChange={() =>
                        setBoardDialog((current) =>
                          current ? { ...current, color } : current,
                        )
                      }
                      type="radio"
                    />
                    <span className="size-5 rounded-full" style={{ backgroundColor: color }} />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setBoardDialog(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Plus aria-hidden="true" className="size-4 text-amber-300" />
                Create board
              </button>
            </div>
          </form>
        </div>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="toast-pop fixed bottom-4 right-4 z-40 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg"
        >
          {feedback}
        </p>
      )}
    </>
  );
}

function BoardRoomContent({
  board,
  dropColumnId,
  editingColumnId,
  editingColumnName,
  isPending,
  newColumnName,
  onAddColumn,
  onDeleteColumn,
  onDeleteTask,
  onDropTask,
  onEditColumn,
  onMoveTask,
  onOpenCollaboration,
  onOpenTask,
  onSaveColumn,
  onSetDropColumnId,
  onSetEditingColumnName,
  onSetNewColumnName,
}: {
  board: KanbanBoardRecord;
  dropColumnId: number | null;
  editingColumnId: number | null;
  editingColumnName: string;
  isPending: boolean;
  newColumnName: string;
  onAddColumn: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteColumn: (columnId: number) => void;
  onDeleteTask: (boardId: number, taskId: number) => void;
  onDropTask: (event: DragEvent<HTMLElement>, columnId: number) => void;
  onEditColumn: (columnId: number, name: string) => void;
  onMoveTask: (taskId: number, targetColumnId: number) => void;
  onOpenCollaboration: () => void;
  onOpenTask: (state: TaskDialogState) => void;
  onSaveColumn: (columnId: number) => void;
  onSetDropColumnId: (columnId: number | null) => void;
  onSetEditingColumnName: (name: string) => void;
  onSetNewColumnName: (name: string) => void;
  replaceBoard: (board: KanbanBoardRecord | null) => void;
}) {
  const { threads } = useThreads();
  const commentCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const thread of threads ?? []) {
      const taskId = Number((thread.metadata as TaskThreadMetadata).taskId);
      const boardId = Number((thread.metadata as TaskThreadMetadata).boardId);

      if (boardId === board.id && taskId) {
        counts.set(taskId, (counts.get(taskId) ?? 0) + thread.comments.filter((comment) => !comment.deletedAt).length);
      }
    }

    return counts;
  }, [board.id, threads]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="size-4 shrink-0 rounded-full shadow-sm"
              style={{ backgroundColor: board.color }}
            />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-950">{board.name}</h2>
            </div>
          </div>
          <PresenceAvatars members={board.members} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-3 text-sm font-medium text-cyan-800 transition hover:border-cyan-200 hover:bg-cyan-100"
            onClick={onOpenCollaboration}
            type="button"
          >
            <Settings2 aria-hidden="true" className="size-4" />
            Collaboration
          </button>
          <form className="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={onAddColumn}>
            <input
              className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
              disabled={board.columns.length >= maxColumns || isPending}
              onChange={(event) => onSetNewColumnName(event.target.value)}
              placeholder={board.columns.length >= maxColumns ? "Column limit reached" : "New column name"}
              value={newColumnName}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={board.columns.length >= maxColumns || isPending}
              type="submit"
            >
              <Columns3 aria-hidden="true" className="size-4 text-teal-500" />
              Add column
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-x-auto pb-2">
        <div className="grid h-full min-w-[760px] auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 lg:min-w-0 lg:grid-flow-row lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">
          {board.columns.map((column) => (
            <article
              className={`flex min-h-[420px] min-w-0 flex-col rounded-lg border p-3 transition duration-200 lg:min-h-0 ${
                dropColumnId === column.id ? "scale-[1.01] border-cyan-300 bg-cyan-50 shadow-lg shadow-cyan-100/70" : "border-slate-100 bg-[color:var(--soft-panel)]"
              }`}
              key={column.id}
              onDragEnter={() => onSetDropColumnId(column.id)}
              onDragLeave={() => onSetDropColumnId(dropColumnId === column.id ? null : dropColumnId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropTask(event, column.id)}
            >
              <div className="flex items-start justify-between gap-2">
                {editingColumnId === column.id ? (
                  <div className="flex min-w-0 flex-1 gap-1">
                    <input
                      className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                      onChange={(event) => onSetEditingColumnName(event.target.value)}
                      value={editingColumnName}
                    />
                    <button
                      aria-label="Save column name"
                      className="grid size-8 place-items-center rounded-md bg-slate-950 text-white"
                      onClick={() => onSaveColumn(column.id)}
                      type="button"
                    >
                      <Check aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{column.name}</h3>
                    <p className="text-xs text-slate-500">{column.tasks.length} tasks</p>
                  </div>
                )}

                <div className="flex shrink-0 gap-1">
                  <button
                    aria-label={`Edit ${column.name}`}
                    className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
                    onClick={() => onEditColumn(column.id, column.name)}
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="size-3.5 text-sky-500" />
                  </button>
                  <button
                    aria-label={`Delete ${column.name}`}
                    className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => onDeleteColumn(column.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </div>

              <button
                className="pressable mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-dashed border-cyan-200 bg-white/70 text-sm font-medium text-cyan-800 transition hover:bg-white"
                onClick={() => onOpenTask({ boardId: board.id, columnId: column.id, task: null })}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add task
              </button>

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {column.tasks.length === 0 && (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white/60 p-3 text-sm text-slate-500">
                    Drop a task here or create one for this column.
                  </div>
                )}
                {column.tasks.map((task) => (
                  <TaskCard
                    board={board}
                    columnId={column.id}
                    commentCount={commentCounts.get(task.id) ?? 0}
                    key={task.id}
                    onDelete={() => onDeleteTask(board.id, task.id)}
                    onEdit={() => onOpenTask({ boardId: board.id, columnId: column.id, task })}
                    onMove={onMoveTask}
                    task={task}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

function PresenceAvatars({ members }: { members: KanbanMemberRecord[] }) {
  const self = useSelf();
  const others = useOthers();
  const activeEmails = new Set([
    ...(self?.info?.email ? [self.info.email] : []),
    ...others.map((other) => other.info.email),
  ]);
  const activeMembers = members.filter((member) => activeEmails.has(member.email));
  const displayMembers = activeMembers.length > 0 ? activeMembers : members.slice(0, 3);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayMembers.slice(0, 5).map((member) => {
          const online = activeEmails.has(member.email);
          return (
            <span
              className="relative grid size-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-sm"
              key={member.email}
              style={{ backgroundColor: member.color }}
              title={`${member.name ?? member.email}${online ? " is active" : ""}`}
            >
              {member.initials}
              {online && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white bg-emerald-400" />
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs text-slate-500">
        {activeMembers.length > 0 ? `${activeMembers.length} active` : "No one active"}
      </span>
    </div>
  );
}

function CollaborationPanel({
  board,
  onClose,
  onFeedback,
  replaceBoard,
}: {
  board: KanbanBoardRecord;
  onClose: () => void;
  onFeedback: (message: string) => void;
  replaceBoard: (board: KanbanBoardRecord | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const self = useSelf();
  const others = useOthers();
  const activeEmails = new Set([
    ...(self?.info?.email ? [self.info.email] : []),
    ...others.map((other) => other.info.email),
  ]);

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const nextBoard = await inviteBoardMemberAction(board.id, email);
        replaceBoard(nextBoard);
        setEmail("");
        onFeedback("Invite added.");
      } catch (error) {
        onFeedback(error instanceof Error ? error.message : "Invite failed.");
      }
    });
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-30 bg-slate-950/35">
      <aside className="panel-enter ml-auto flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white bg-white shadow-2xl shadow-slate-950/20">
        <div className="border-b border-slate-100 p-4">
          <DialogHeader eyebrow="Settings" onClose={onClose} title="Collaboration" />
          <div className="mt-3 flex items-center gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
            <Share2 aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{board.name} · {board.members.length} shared</span>
          </div>
        </div>

        <form className="border-b border-slate-100 p-4" onSubmit={invite}>
          <label className="block text-xs font-medium text-slate-600">
            Invite by email
            <span className="mt-2 flex gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                type="email"
                value={email}
              />
              <button
                className="grid size-10 place-items-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:opacity-60"
                disabled={isPending || !email.trim()}
                type="submit"
                title="Invite user"
              >
                <UserPlus aria-hidden="true" className="size-4 text-amber-300" />
              </button>
            </span>
          </label>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-950">Shared with</h3>
            <Users aria-hidden="true" className="size-4 text-cyan-500" />
          </div>

          {board.members.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-[color:var(--soft-panel)] p-4 text-sm text-slate-500">
              Invite a teammate to start collaborating on this board.
            </div>
          ) : (
            <div className="space-y-2">
              {board.members.map((member) => {
                const online = activeEmails.has(member.email);

                return (
                  <div
                    className="flex items-center gap-3 rounded-md border border-slate-100 bg-[color:var(--soft-panel)] p-3"
                    key={member.email}
                  >
                    <span
                      className="relative grid size-9 place-items-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                      {online && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white bg-emerald-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {member.name ?? member.email}
                      </p>
                      <p className="truncate text-xs text-slate-500">{member.email}</p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                      {member.role}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${
                        member.status === "active"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {online ? "online" : member.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DialogHeader({
  eyebrow,
  onClose,
  title,
}: {
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase text-cyan-600">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <button
        aria-label="Close dialog"
        className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function TaskDialog({
  boardId,
  columnName,
  onClose,
  onSubmit,
  task,
}: {
  boardId: number;
  columnName: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  task: KanbanTaskRecord | null;
}) {
  const selectedLabels = task?.labelIds ?? ["work"];
  const updatePresence = useUpdateMyPresence();

  useEffect(() => {
    updatePresence({ activeTaskId: task ? String(task.id) : null });
    return () => updatePresence({ activeTaskId: null });
  }, [task, updatePresence]);

  return (
    <div className="modal-backdrop fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
      <div className="modal-panel grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-white bg-white shadow-2xl shadow-slate-950/20 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="min-h-0 overflow-y-auto p-4 sm:p-5" onSubmit={onSubmit}>
          <DialogHeader
            eyebrow={task ? "Task details" : columnName}
            onClose={onClose}
            title={task ? "Update task details" : "Add task"}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
              Title
              <input
                autoFocus
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                defaultValue={task?.title ?? ""}
                name="title"
                placeholder="Write launch checklist"
                required
              />
            </label>
            <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
              Description
              <textarea
                className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                defaultValue={task?.description ?? ""}
                name="description"
                placeholder="Add useful context"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Due date
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                defaultValue={task?.dueDate || todayKey()}
                name="dueDate"
                type="date"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Priority
              <span className="relative mt-1 block">
                <select
                  className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  defaultValue={task?.priority ?? "Medium"}
                  name="priority"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-3 size-4 text-slate-400"
                />
              </span>
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="text-xs font-medium text-slate-600">Labels</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {labelOptions.map((label) => (
                  <label
                    className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${label.className}`}
                    key={label.id}
                  >
                    <input
                      defaultChecked={selectedLabels.includes(label.id)}
                      name="labels"
                      type="checkbox"
                      value={label.id}
                    />
                    <span className={`size-2.5 rounded-full ${label.dotClassName}`} />
                    {label.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <ToggleField
              defaultChecked={task?.syncCalendar ?? false}
              icon={<CalendarDays aria-hidden="true" className="size-4 text-emerald-500" />}
              label="Sync with Calendar"
              name="syncCalendar"
            />
            <ToggleField
              defaultChecked={task?.linkNotes ?? false}
              icon={<NotebookPen aria-hidden="true" className="size-4 text-rose-500" />}
              label="Link with Notes"
              name="linkNotes"
            />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
              type="submit"
            >
              <Check aria-hidden="true" className="size-4 text-emerald-300" />
              {task ? "Save changes" : "Add task"}
            </button>
          </div>
        </form>

        <aside className="min-h-0 overflow-y-auto border-t border-slate-100 bg-[color:var(--soft-panel)] p-4 lg:border-l lg:border-t-0">
          {task ? (
            <TaskComments boardId={boardId} task={task} />
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
              Save the task before starting a comment thread.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TaskComments({ boardId, task }: { boardId: number; task: KanbanTaskRecord }) {
  const { threads } = useThreads();
  const taskThreads = (threads ?? []).filter((thread) => threadBelongsToTask(thread, boardId, task.id));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-600">Discussion</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">Task comments</h3>
        </div>
        <MessageCircle aria-hidden="true" className="size-4 text-rose-500" />
      </div>

      <div className="space-y-3">
        {taskThreads.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
            No comments yet. Start a thread for this task.
          </div>
        ) : (
          taskThreads.map((thread) => (
            <Thread
              className="rounded-md border border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/50"
              key={thread.id}
              thread={thread}
            />
          ))
        )}

        <div className="rounded-md border border-cyan-100 bg-white p-2">
          <Composer
            metadata={{ boardId: String(boardId), taskId: String(task.id) }}
            overrides={{ COMPOSER_PLACEHOLDER: "Add a comment..." }}
          />
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  defaultChecked,
  icon,
  label,
  name,
}: {
  defaultChecked: boolean;
  icon: ReactNode;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-slate-100 bg-[color:var(--soft-panel)] px-3 text-sm font-medium text-slate-700">
      <span className="inline-flex min-w-0 items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <input
        className="size-4 accent-slate-950"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

function TaskCard({
  board,
  columnId,
  commentCount,
  onDelete,
  onEdit,
  onMove,
  task,
}: {
  board: KanbanBoardRecord;
  columnId: number;
  commentCount: number;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (taskId: number, targetColumnId: number) => void;
  task: KanbanTaskRecord;
}) {
  return (
    <article
      className="pressable group rounded-lg border border-white bg-white p-3 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-cyan-100 hover:shadow-md hover:shadow-slate-200/80 active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/kanban-task-id", String(task.id));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold text-slate-950">{task.title}</h4>
          {task.description && (
            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${priorityTone[task.priority]}`}
        >
          {task.priority}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <CalendarDays aria-hidden="true" className="size-3 text-emerald-500" />
          {task.dueDate || "No date"}
        </span>
        {task.syncCalendar && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <CalendarDays aria-hidden="true" className="size-3" />
            Synced
          </span>
        )}
        {task.linkNotes && (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-100 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
            <Link2 aria-hidden="true" className="size-3" />
            Notes
          </span>
        )}
      </div>

      {task.labelIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labelIds.map((labelId) => {
            const label = labelFor(labelId);

            if (!label) {
              return null;
            }

            return (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${label.className}`}
                key={label.id}
              >
                <Tag aria-hidden="true" className="size-3" />
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <select
          aria-label={`Move ${task.title}`}
          className="h-8 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          onChange={(event) => onMove(task.id, Number(event.target.value))}
          value={columnId}
        >
          {board.columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            aria-label={`Comments for ${task.title}`}
            className="relative grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
            onClick={onEdit}
            type="button"
          >
            <MessageCircle aria-hidden="true" className="size-3.5 text-rose-500" />
            {commentCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-slate-950 px-1 text-[10px] font-bold leading-4 text-white">
                {commentCount}
              </span>
            )}
          </button>
          <button
            aria-label={`Edit ${task.title}`}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
            onClick={onEdit}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-3.5 text-sky-500" />
          </button>
          <button
            aria-label={`Delete ${task.title}`}
            className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            onClick={onDelete}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
