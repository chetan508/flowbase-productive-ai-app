"use server";

import { createCalendarItemAction } from "@/app/calendar/actions";
import { generateTemplateAppAction } from "@/app/ai-template-builder/actions";
import { createBoardAction, getKanbanBoardsForCurrentUser, saveTaskAction } from "@/app/kanban/actions";
import { createNoteAction } from "@/app/notes/actions";
import { updateSettingsAction } from "@/app/settings/actions";
import { createWhiteboardAction } from "@/app/whiteboard/actions";
import type { Priority } from "@/lib/kanban";

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantActionType =
  | "create_kanban_board"
  | "add_kanban_task"
  | "create_calendar_item"
  | "create_note"
  | "summarize_text"
  | "refine_text"
  | "create_whiteboard"
  | "generate_template_app"
  | "update_settings";

export type PendingAssistantAction = {
  type: AssistantActionType;
  summary: string;
  payload: Record<string, unknown>;
};

export type AssistantResponse = {
  content: string;
  pendingAction?: PendingAssistantAction;
};

type GeminiPlan = {
  mode?: "reply" | "clarify" | "propose";
  content?: string;
  action?: AssistantActionType;
  summary?: string;
  payload?: Record<string, unknown>;
};

const geminiTimeoutMs = 5000;
const boardColors = ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#2dd4bf"];
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanDate(value: unknown) {
  const date = cleanText(value);
  return dateKeyPattern.test(date) ? date : "";
}

function cleanPriority(value: unknown): Priority {
  return value === "Low" || value === "High" ? value : "Medium";
}

function todayKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseJsonFromText(text: string): GeminiPlan {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }
  return JSON.parse(jsonText.slice(start, end + 1)) as GeminiPlan;
}

function geminiModelCandidates() {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(new Set([configured, "gemini-2.0-flash-lite", "gemini-2.0-flash"].filter(Boolean))).map((model) =>
    model!.replace(/^models\//, ""),
  );
}

async function requestGeminiPlan(messages: AssistantChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), geminiTimeoutMs);
  const model = geminiModelCandidates()[0];
  const conversation = messages.slice(-8).map((message) => `${message.role}: ${message.content}`).join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          generationConfig: {
            candidateCount: 1,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
            temperature: 0.25,
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are Flowbase AI Assistant. Today is ${todayKey()}.
Return JSON only:
{"mode":"reply|clarify|propose","content":"","action":"optional action","summary":"optional confirmation summary","payload":{}}

Actions: create_kanban_board, add_kanban_task, create_calendar_item, create_note, summarize_text, refine_text, create_whiteboard, generate_template_app, update_settings.
Ask clarify when required details are missing. Dates must be YYYY-MM-DD. Reminders need scheduledDate.
Use propose for app writes. Use reply for normal answers, summarizing, and refining.
For Kanban tasks, include boardName or boardId only if the user clearly named it. Otherwise the app will resolve or ask.
Conversation:
${conversation}`,
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    return parseJsonFromText(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function localPlan(messages: AssistantChatMessage[]): GeminiPlan {
  const latest = messages[messages.length - 1]?.content ?? "";
  const lower = latest.toLowerCase();
  const title = latest.replace(/^(create|add|make|generate|plan)\s+/i, "").trim();

  if (lower.includes("summarize")) {
    return {
      mode: "reply",
      content: `Here is a concise summary: ${latest.replace(/summarize/gi, "").trim() || "Share the note text you want summarized."}`,
    };
  }

  if (lower.includes("meeting") && !/\b(today|tomorrow|\d{4}-\d{2}-\d{2})\b/i.test(latest)) {
    return { mode: "clarify", content: "What date should I use for that meeting reminder?" };
  }

  if (lower.includes("kanban board") || lower.includes("board")) {
    return {
      mode: "propose",
      action: "create_kanban_board",
      summary: `Create a Kanban board named "${title || "New board"}".`,
      payload: { name: title || "New board", color: "#38bdf8" },
    };
  }

  if (lower.includes("reminder") || lower.includes("calendar") || lower.includes("meeting")) {
    const scheduledDate = lower.includes("tomorrow") ? todayKey(1) : lower.includes("today") ? todayKey() : "";
    if (!scheduledDate) {
      return { mode: "clarify", content: "What date should I add this to the calendar?" };
    }
    return {
      mode: "propose",
      action: "create_calendar_item",
      summary: `Add "${title || "New reminder"}" to the calendar for ${scheduledDate}.`,
      payload: {
        kind: lower.includes("reminder") || lower.includes("meeting") ? "reminder" : "task",
        title: title || "New reminder",
        scheduledDate,
      },
    };
  }

  if (lower.includes("note")) {
    return {
      mode: "propose",
      action: "create_note",
      summary: `Create a note named "${title || "New note"}".`,
      payload: { title: title || "New note", content: `<p>${latest}</p>` },
    };
  }

  if (lower.includes("template") || lower.includes("tracker")) {
    return {
      mode: "propose",
      action: "generate_template_app",
      summary: `Generate an app from "${latest}".`,
      payload: { prompt: latest },
    };
  }

  if (lower.includes("task")) {
    const dueDate = lower.includes("tomorrow") ? todayKey(1) : lower.includes("today") ? todayKey() : "";
    return {
      mode: "propose",
      action: "add_kanban_task",
      summary: `Add a Kanban task "${title || "New task"}"${dueDate ? ` due ${dueDate}` : ""}.`,
      payload: { title: title || "New task", dueDate, priority: "Medium" },
    };
  }

  return {
    mode: "reply",
    content:
      "I can help answer questions or prepare actions for Kanban, Calendar, Notes, Whiteboard, Templates, and Settings. Tell me what you want to make or change.",
  };
}

function fastLocalPlan(messages: AssistantChatMessage[]): GeminiPlan | null {
  const latest = messages[messages.length - 1]?.content ?? "";
  const lower = latest.toLowerCase();
  const appCommandWords = [
    "summarize",
    "refine",
    "kanban board",
    "create board",
    "new board",
    "reminder",
    "calendar",
    "meeting",
    "note",
    "template",
    "tracker",
    "task",
    "whiteboard",
  ];

  return appCommandWords.some((word) => lower.includes(word)) ? localPlan(messages) : null;
}

function isYes(value: string) {
  return /^(yes|y|confirm|confirmed|do it|save it|go ahead|looks good)$/i.test(value.trim());
}

function isNo(value: string) {
  return /^(no|n|cancel|stop|never mind|dont|don't)$/i.test(value.trim());
}

async function normalizePendingAction(plan: GeminiPlan): Promise<AssistantResponse> {
  const type = plan.action;
  if (!type || !plan.payload) {
    return { content: plan.content || "I need one more detail before I can prepare that action." };
  }

  if (type === "add_kanban_task") {
    const boards = await getKanbanBoardsForCurrentUser();
    const payload = { ...plan.payload };
    const requestedBoard = cleanText(payload.boardName).toLowerCase();
    const board =
      boards.find((candidate) => String(candidate.id) === String(payload.boardId)) ??
      boards.find((candidate) => requestedBoard && candidate.name.toLowerCase().includes(requestedBoard)) ??
      (boards.length === 1 ? boards[0] : null);

    if (!board) {
      return {
        content: `Which board should I use? Available boards: ${boards.map((item) => item.name).join(", ")}.`,
      };
    }

    const requestedColumn = cleanText(payload.columnName).toLowerCase();
    const column =
      board.columns.find((candidate) => String(candidate.id) === String(payload.columnId)) ??
      board.columns.find((candidate) => requestedColumn && candidate.name.toLowerCase().includes(requestedColumn)) ??
      board.columns.find((candidate) => /todo|to do|backlog/i.test(candidate.name)) ??
      board.columns[0];

    if (!column) {
      return { content: `I found ${board.name}, but it does not have a column to place the task in.` };
    }

    payload.boardId = board.id;
    payload.boardName = board.name;
    payload.columnId = column.id;
    payload.columnName = column.name;
    return {
      content: `Please confirm: ${plan.summary || `Add a task to ${board.name}.`}`,
      pendingAction: { type, summary: plan.summary || `Add task to ${board.name}`, payload },
    };
  }

  return {
    content: `Please confirm: ${plan.summary || "Run this action."}`,
    pendingAction: {
      type,
      summary: plan.summary || "Run this action.",
      payload: plan.payload,
    },
  };
}

async function executeAction(action: PendingAssistantAction): Promise<AssistantResponse> {
  const payload = action.payload;

  if (action.type === "create_kanban_board") {
    const board = await createBoardAction({
      name: cleanText(payload.name, "New board"),
      color: boardColors.includes(cleanText(payload.color)) ? cleanText(payload.color) : "#38bdf8",
    });
    return { content: `Done. I created the Kanban board "${board?.name ?? cleanText(payload.name, "New board")}".` };
  }

  if (action.type === "add_kanban_task") {
    const boardId = Number(payload.boardId);
    const columnId = Number(payload.columnId);
    if (!Number.isFinite(boardId) || !Number.isFinite(columnId)) {
      return { content: "I need a board and column before I can add that task." };
    }
    await saveTaskAction({
      boardId,
      columnId,
      title: cleanText(payload.title, "New task"),
      description: cleanText(payload.description),
      dueDate: cleanDate(payload.dueDate) || null,
      priority: cleanPriority(payload.priority),
      labelIds: Array.isArray(payload.labelIds) ? payload.labelIds.map(String) : ["work"],
      syncCalendar: Boolean(payload.syncCalendar),
      linkNotes: Boolean(payload.linkNotes),
    });
    return { content: `Done. I added "${cleanText(payload.title, "New task")}" to ${cleanText(payload.boardName, "your Kanban board")}.` };
  }

  if (action.type === "create_calendar_item") {
    const kind = payload.kind === "reminder" ? "reminder" : "task";
    const scheduledDate = cleanDate(payload.scheduledDate);
    if (kind === "reminder" && !scheduledDate) {
      return { content: "What date should I use for this reminder?" };
    }
    const item = await createCalendarItemAction({
      kind,
      title: cleanText(payload.title, "New calendar item"),
      notes: cleanText(payload.notes) || null,
      categoryKey: null,
      scheduledDate: scheduledDate || null,
    });
    return { content: `Done. I added "${item.title}" to your calendar${item.scheduledDate ? ` for ${item.scheduledDate}` : ""}.` };
  }

  if (action.type === "create_note") {
    const note = await createNoteAction({
      title: cleanText(payload.title, "New note"),
      content: cleanText(payload.content, `<p>${cleanText(payload.title, "New note")}</p>`),
      color: cleanText(payload.color, "violet"),
    });
    return { content: `Done. I created the note "${note.title}".` };
  }

  if (action.type === "create_whiteboard") {
    const board = await createWhiteboardAction({
      name: cleanText(payload.name, cleanText(payload.prompt, "AI idea board")),
      color: cleanText(payload.color, "#38bdf8"),
    });
    return { content: `Done. I created the whiteboard "${board.name}".` };
  }

  if (action.type === "generate_template_app") {
    const app = await generateTemplateAppAction(cleanText(payload.prompt, cleanText(payload.name, "Productivity tracker")));
    return { content: `Done. I generated "${app.appName}" in AI Template Builder.` };
  }

  if (action.type === "update_settings") {
    await updateSettingsAction({
      theme: cleanText(payload.theme) || undefined,
      defaultCalendarView: cleanText(payload.defaultCalendarView) || undefined,
      defaultTaskPriority: cleanText(payload.defaultTaskPriority) || undefined,
      autoSave: typeof payload.autoSave === "boolean" ? payload.autoSave : undefined,
    });
    return { content: "Done. I updated your settings." };
  }

  return { content: "That action is not available yet." };
}

export async function sendAssistantMessageAction(input: {
  messages: AssistantChatMessage[];
  pendingAction?: PendingAssistantAction | null;
}): Promise<AssistantResponse> {
  const latest = input.messages[input.messages.length - 1]?.content ?? "";

  if (input.pendingAction) {
    if (isYes(latest)) {
      return executeAction(input.pendingAction);
    }
    if (isNo(latest)) {
      return { content: "Canceled. Nothing was saved." };
    }
  }

  const plan = fastLocalPlan(input.messages) ?? (await requestGeminiPlan(input.messages)) ?? localPlan(input.messages);

  if (plan.mode === "clarify") {
    return { content: plan.content || "Can you share one more detail?" };
  }

  if (plan.mode === "propose") {
    return normalizePendingAction(plan);
  }

  return { content: plan.content || "I am here. What would you like to work on?" };
}
