"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Columns3,
  GripVertical,
  Layers3,
  Link2,
  NotebookPen,
  Palette,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

type Priority = "Low" | "Medium" | "High";

type LabelOption = {
  id: string;
  name: string;
  className: string;
  dotClassName: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  labelIds: string[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

type Column = {
  id: string;
  name: string;
  tasks: Task[];
};

type Board = {
  id: string;
  name: string;
  color: string;
  columns: Column[];
};

type BoardDialogState = {
  name: string;
  color: string;
};

type TaskDialogState = {
  boardId: string;
  columnId: string;
  task: Task | null;
};

const storageKey = "flowbase-kanban-boards";
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

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function defaultColumns(): Column[] {
  return ["Todo", "In Progress", "Done"].map((name) => ({
    id: uid("column"),
    name,
    tasks: [],
  }));
}

function seedBoards(): Board[] {
  const columns = defaultColumns();
  columns[0].tasks = [
    {
      id: uid("task"),
      title: "Shape onboarding checklist",
      description: "Turn the latest notes into a focused first-pass task list.",
      dueDate: todayKey(),
      priority: "High",
      labelIds: ["work", "focus"],
      syncCalendar: true,
      linkNotes: true,
    },
    {
      id: uid("task"),
      title: "Collect visual references",
      description: "Pull warm UI examples for the next workspace polish pass.",
      dueDate: todayKey(),
      priority: "Medium",
      labelIds: ["design"],
      syncCalendar: false,
      linkNotes: true,
    },
  ];
  columns[1].tasks = [
    {
      id: uid("task"),
      title: "Review calendar flow",
      description: "Check the drag states and empty states before shipping.",
      dueDate: todayKey(),
      priority: "Low",
      labelIds: ["focus"],
      syncCalendar: true,
      linkNotes: false,
    },
  ];

  return [
    {
      id: uid("board"),
      name: "Weekly Flow",
      color: "#38bdf8",
      columns,
    },
  ];
}

function labelFor(id: string) {
  return labelOptions.find((label) => label.id === id);
}

function totalTasks(board: Board) {
  return board.columns.reduce((count, column) => count + column.tasks.length, 0);
}

function moveTaskBetweenColumns(
  boards: Board[],
  boardId: string,
  taskId: string,
  targetColumnId: string,
) {
  let movingTask: Task | null = null;

  const withoutTask = boards.map((board) => {
    if (board.id !== boardId) {
      return board;
    }

    return {
      ...board,
      columns: board.columns.map((column) => {
        const task = column.tasks.find((item) => item.id === taskId);

        if (task) {
          movingTask = task;
        }

        return {
          ...column,
          tasks: column.tasks.filter((item) => item.id !== taskId),
        };
      }),
    };
  });

  if (!movingTask) {
    return boards;
  }

  return withoutTask.map((board) => {
    if (board.id !== boardId) {
      return board;
    }

    return {
      ...board,
      columns: board.columns.map((column) =>
        column.id === targetColumnId
          ? { ...column, tasks: [...column.tasks, movingTask as Task] }
          : column,
      ),
    };
  });
}

export function KanbanWorkspace() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [boardDialog, setBoardDialog] = useState<BoardDialogState | null>(null);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const storedBoards = window.localStorage.getItem(storageKey);

    if (storedBoards) {
      const parsedBoards = JSON.parse(storedBoards) as Board[];
      setBoards(parsedBoards);
      setSelectedBoardId(parsedBoards[0]?.id ?? null);
      return;
    }

    const starterBoards = seedBoards();
    setBoards(starterBoards);
    setSelectedBoardId(starterBoards[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (boards.length > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(boards));
    }
  }, [boards]);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null,
    [boards, selectedBoardId],
  );

  useEffect(() => {
    if (feedback) {
      const timer = window.setTimeout(() => setFeedback(null), 2400);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [feedback]);

  function createBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!boardDialog?.name.trim()) {
      return;
    }

    const board: Board = {
      id: uid("board"),
      name: boardDialog.name.trim(),
      color: boardDialog.color,
      columns: defaultColumns(),
    };

    setBoards((current) => [...current, board]);
    setSelectedBoardId(board.id);
    setBoardDialog(null);
    setFeedback("Board created.");
  }

  function addColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoard || !newColumnName.trim()) {
      return;
    }

    if (selectedBoard.columns.length >= maxColumns) {
      setFeedback("Each board can have up to 5 columns.");
      return;
    }

    setBoards((current) =>
      current.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              columns: [
                ...board.columns,
                { id: uid("column"), name: newColumnName.trim(), tasks: [] },
              ],
            }
          : board,
      ),
    );
    setNewColumnName("");
  }

  function saveColumnName(columnId: string) {
    const name = editingColumnName.trim();

    if (!selectedBoard || !name) {
      return;
    }

    setBoards((current) =>
      current.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              columns: board.columns.map((column) =>
                column.id === columnId ? { ...column, name } : column,
              ),
            }
          : board,
      ),
    );
    setEditingColumnId(null);
    setEditingColumnName("");
  }

  function deleteColumn(columnId: string) {
    if (!selectedBoard) {
      return;
    }

    setBoards((current) =>
      current.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              columns: board.columns.filter((column) => column.id !== columnId),
            }
          : board,
      ),
    );
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!taskDialog) {
      return;
    }

    const task: Task = {
      id: taskDialog.task?.id ?? uid("task"),
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? todayKey()),
      priority: String(formData.get("priority") ?? "Medium") as Priority,
      labelIds: formData.getAll("labels").map(String),
      syncCalendar: formData.get("syncCalendar") === "on",
      linkNotes: formData.get("linkNotes") === "on",
    };

    if (!task.title) {
      return;
    }

    setBoards((current) =>
      current.map((board) => {
        if (board.id !== taskDialog.boardId) {
          return board;
        }

        return {
          ...board,
          columns: board.columns.map((column) => {
            if (column.id !== taskDialog.columnId) {
              return taskDialog.task
                ? {
                    ...column,
                    tasks: column.tasks.filter((item) => item.id !== task.id),
                  }
                : column;
            }

            const existingTasks = column.tasks.filter((item) => item.id !== task.id);
            return { ...column, tasks: [...existingTasks, task] };
          }),
        };
      }),
    );
    setTaskDialog(null);
    setFeedback(taskDialog.task ? "Task updated." : "Task added.");
  }

  function deleteTask(boardId: string, taskId: string) {
    setBoards((current) =>
      current.map((board) =>
        board.id === boardId
          ? {
              ...board,
              columns: board.columns.map((column) => ({
                ...column,
                tasks: column.tasks.filter((task) => task.id !== taskId),
              })),
            }
          : board,
      ),
    );
  }

  function moveTask(taskId: string, targetColumnId: string) {
    if (!selectedBoard) {
      return;
    }

    setBoards((current) =>
      moveTaskBetweenColumns(current, selectedBoard.id, taskId, targetColumnId),
    );
  }

  function dropTask(event: DragEvent<HTMLElement>, columnId: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/kanban-task-id");
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
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
                  className={`flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border px-3 text-left transition ${
                    active
                      ? "border-sky-200 bg-white text-slate-950 shadow-sm shadow-sky-100/80"
                      : "border-slate-100 bg-[color:var(--soft-panel)] text-slate-700 hover:border-cyan-100 hover:bg-white"
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
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="size-4 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: selectedBoard.color }}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">
                      {selectedBoard.name}
                    </h2>
                  </div>
                </div>

                <form className="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={addColumn}>
                  <input
                    className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50"
                    disabled={selectedBoard.columns.length >= maxColumns}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    placeholder={
                      selectedBoard.columns.length >= maxColumns
                        ? "Column limit reached"
                        : "New column name"
                    }
                    value={newColumnName}
                  />
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={selectedBoard.columns.length >= maxColumns}
                    type="submit"
                  >
                    <Columns3 aria-hidden="true" className="size-4 text-teal-500" />
                    Add column
                  </button>
                </form>
              </div>

              <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-x-auto pb-2">
                <div className="grid h-full min-w-[760px] auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 lg:min-w-0 lg:grid-flow-row lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">
                  {selectedBoard.columns.map((column) => (
                    <article
                      className={`flex min-h-[420px] min-w-0 flex-col rounded-lg border p-3 transition lg:min-h-0 ${
                        dropColumnId === column.id
                          ? "border-cyan-300 bg-cyan-50"
                          : "border-slate-100 bg-[color:var(--soft-panel)]"
                      }`}
                      key={column.id}
                      onDragEnter={() => setDropColumnId(column.id)}
                      onDragLeave={() =>
                        setDropColumnId((current) => (current === column.id ? null : current))
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropTask(event, column.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {editingColumnId === column.id ? (
                          <div className="flex min-w-0 flex-1 gap-1">
                            <input
                              className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                              onChange={(event) => setEditingColumnName(event.target.value)}
                              value={editingColumnName}
                            />
                            <button
                              aria-label="Save column name"
                              className="grid size-8 place-items-center rounded-md bg-slate-950 text-white"
                              onClick={() => saveColumnName(column.id)}
                              type="button"
                            >
                              <Check aria-hidden="true" className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-950">
                              {column.name}
                            </h3>
                            <p className="text-xs text-slate-500">{column.tasks.length} tasks</p>
                          </div>
                        )}

                        <div className="flex shrink-0 gap-1">
                          <button
                            aria-label={`Edit ${column.name}`}
                            className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-slate-950"
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditingColumnName(column.name);
                            }}
                            type="button"
                          >
                            <Pencil aria-hidden="true" className="size-3.5 text-sky-500" />
                          </button>
                          <button
                            aria-label={`Delete ${column.name}`}
                            className="grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => deleteColumn(column.id)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <button
                        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-dashed border-cyan-200 bg-white/70 text-sm font-medium text-cyan-800 transition hover:bg-white"
                        onClick={() =>
                          setTaskDialog({
                            boardId: selectedBoard.id,
                            columnId: column.id,
                            task: null,
                          })
                        }
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
                            board={selectedBoard}
                            columnId={column.id}
                            key={task.id}
                            onDelete={() => deleteTask(selectedBoard.id, task.id)}
                            onEdit={() =>
                              setTaskDialog({
                                boardId: selectedBoard.id,
                                columnId: column.id,
                                task,
                              })
                            }
                            onMove={moveTask}
                            task={task}
                          />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
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
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
          <form
            className="w-full max-w-md rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5"
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

      {taskDialog && selectedBoard && (
        <TaskDialog
          columnName={
            selectedBoard.columns.find((column) => column.id === taskDialog.columnId)?.name ??
            "Task"
          }
          onClose={() => setTaskDialog(null)}
          onSubmit={saveTask}
          task={taskDialog.task}
        />
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg border border-white bg-slate-950 px-3 py-2 text-sm text-white shadow-lg"
        >
          {feedback}
        </p>
      )}
    </>
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
  columnName,
  onClose,
  onSubmit,
  task,
}: {
  columnName: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  task: Task | null;
}) {
  const selectedLabels = task?.labelIds ?? ["work"];

  return (
    <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/35 p-4">
      <form
        className="w-full max-w-2xl rounded-lg border border-white bg-white p-4 shadow-2xl shadow-slate-950/20 sm:p-5"
        onSubmit={onSubmit}
      >
        <DialogHeader
          eyebrow={task ? "Edit task" : columnName}
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
              defaultValue={task?.dueDate ?? todayKey()}
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
  icon: React.ReactNode;
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
  onDelete,
  onEdit,
  onMove,
  task,
}: {
  board: Board;
  columnId: string;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (taskId: string, targetColumnId: string) => void;
  task: Task;
}) {
  return (
    <article
      className="group rounded-lg border border-white bg-white p-3 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-cyan-100 hover:shadow-md hover:shadow-slate-200/80"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/kanban-task-id", task.id);
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
          onChange={(event) => onMove(task.id, event.target.value)}
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
