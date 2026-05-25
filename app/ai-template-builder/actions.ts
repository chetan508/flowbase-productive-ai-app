"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, generatedApps, type GeneratedApp, type GeneratedAppTemplate } from "@/db";
import { normalizeGeneratedAppTemplate } from "@/lib/generated-apps";
import { requireWorkspaceUser } from "@/lib/workspace-user";

export type GeneratedAppRecord = {
  id: number;
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: string;
  template: GeneratedAppTemplate;
  addedToSidebar: boolean;
  createdAt: string;
  updatedAt: string;
};

const maxSidebarApps = 3;
const maxPromptLength = 800;
const geminiTimeoutMs = 3500;
const geminiModelFallbacks = [
  "gemini-2.0-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
];

function toRecord(app: GeneratedApp): GeneratedAppRecord {
  return {
    id: app.id,
    appName: app.appName,
    description: app.description,
    icon: app.icon,
    color: app.color,
    layout: app.layout,
    template: app.template,
    addedToSidebar: app.addedToSidebar === 1,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("AI returned an empty response.");

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include JSON.");
  }

  return JSON.parse(jsonText.slice(start, end + 1)) as unknown;
}

function geminiModelCandidates() {
  const configured = process.env.GEMINI_MODEL?.trim();
  return Array.from(new Set([configured, ...geminiModelFallbacks].filter(Boolean))).map((model) =>
    model!.replace(/^models\//, ""),
  );
}

async function requestGeminiTemplate(prompt: string, model: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), geminiTimeoutMs);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        generationConfig: {
          candidateCount: 1,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
          temperature: 0.35,
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Return JSON only for a functional single-page productivity mini app based on: "${prompt}".
Shape: {"appName":"","description":"","icon":"","color":"#hex","layout":"single-page","sections":[{"title":"","description":"","components":[]}],"components":[{"type":"","title":"","description":"","fields":[],"items":[],"actions":[]}],"fields":[{"label":"","type":"text","placeholder":"","options":[]}],"actions":[],"sampleData":[]}
Allowed icons: Flame, PiggyBank, Utensils, GraduationCap, CalendarDays, ListChecks, Target, WalletCards, NotebookPen, Sparkles.
Allowed component types: stats, form, checklist, progress, table, list, buttons, tags, chart.
Allowed field types: text, number, date, select, checkbox, textarea.
Use 4-6 components, 3 fields, 4 sampleData rows with name/status/progress. Keep text short.`,
              },
            ],
          },
        ],
      }),
    },
  );
  clearTimeout(timeout);

  if (!response.ok) return null;

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  return parseJsonFromText(text);
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  for (const model of geminiModelCandidates().slice(0, 1)) {
    try {
      const output = await requestGeminiTemplate(prompt, model, apiKey);
      if (output) return output;
    } catch {
      // Try the next supported Gemini model before falling back to the local template builder.
    }
  }

  return null;
}

export async function getGeneratedAppsForCurrentUser(): Promise<GeneratedAppRecord[]> {
  const user = await requireWorkspaceUser();
  const apps = await db.query.generatedApps.findMany({
    orderBy: [desc(generatedApps.updatedAt), desc(generatedApps.createdAt)],
    where: eq(generatedApps.ownerId, user.id),
  });

  return apps.map(toRecord);
}

export async function getSidebarGeneratedAppsAction(): Promise<GeneratedAppRecord[]> {
  const user = await requireWorkspaceUser();
  const apps = await db.query.generatedApps.findMany({
    orderBy: [desc(generatedApps.updatedAt), desc(generatedApps.createdAt)],
    where: and(eq(generatedApps.ownerId, user.id), eq(generatedApps.addedToSidebar, 1)),
  });

  return apps.map(toRecord);
}

export async function getGeneratedAppAction(appId: number): Promise<GeneratedAppRecord | null> {
  const user = await requireWorkspaceUser();
  const app = await db.query.generatedApps.findFirst({
    where: and(eq(generatedApps.id, appId), eq(generatedApps.ownerId, user.id)),
  });

  return app ? toRecord(app) : null;
}

export async function generateTemplateAppAction(promptInput: string): Promise<GeneratedAppRecord> {
  const user = await requireWorkspaceUser();
  const prompt = promptInput.trim().slice(0, maxPromptLength);
  if (prompt.length < 3) {
    throw new Error("Describe the app you want to build.");
  }

  const aiOutput = await generateWithGemini(prompt);
  const template = normalizeGeneratedAppTemplate(aiOutput, prompt);
  const [app] = await db
    .insert(generatedApps)
    .values({
      ownerId: user.id,
      appName: template.appName,
      description: template.description,
      icon: template.icon,
      color: template.color,
      layout: template.layout,
      template,
    })
    .returning();

  revalidatePath("/ai-template-builder");
  return toRecord(app);
}

export async function toggleGeneratedAppSidebarAction(appId: number, addToSidebar: boolean): Promise<GeneratedAppRecord> {
  const user = await requireWorkspaceUser();
  const app = await db.query.generatedApps.findFirst({
    where: and(eq(generatedApps.id, appId), eq(generatedApps.ownerId, user.id)),
  });
  if (!app) throw new Error("Generated app not found.");

  if (addToSidebar && app.addedToSidebar !== 1) {
    const sidebarApps = await db.query.generatedApps.findMany({
      where: and(eq(generatedApps.ownerId, user.id), eq(generatedApps.addedToSidebar, 1)),
    });
    if (sidebarApps.length >= maxSidebarApps) {
      throw new Error("You can add up to 3 generated apps to the sidebar.");
    }
  }

  const [updated] = await db
    .update(generatedApps)
    .set({ addedToSidebar: addToSidebar ? 1 : 0, updatedAt: new Date() })
    .where(and(eq(generatedApps.id, appId), eq(generatedApps.ownerId, user.id)))
    .returning();

  revalidatePath("/ai-template-builder");
  revalidatePath(`/ai-template-builder/${appId}`);
  return toRecord(updated);
}

export async function deleteGeneratedAppAction(appId: number): Promise<number> {
  const user = await requireWorkspaceUser();
  await db.delete(generatedApps).where(and(eq(generatedApps.id, appId), eq(generatedApps.ownerId, user.id)));

  revalidatePath("/ai-template-builder");
  revalidatePath(`/ai-template-builder/${appId}`);
  return appId;
}
