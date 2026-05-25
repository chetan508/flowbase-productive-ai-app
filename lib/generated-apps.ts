import type {
  GeneratedAppComponent,
  GeneratedAppField,
  GeneratedAppSection,
  GeneratedAppTemplate,
} from "@/db";

export const generatedAppIconNames = [
  "BadgeDollarSign",
  "BookOpen",
  "CalendarDays",
  "CheckSquare",
  "ClipboardList",
  "Flame",
  "GraduationCap",
  "HeartPulse",
  "LineChart",
  "ListChecks",
  "NotebookPen",
  "PiggyBank",
  "Sparkles",
  "Target",
  "Utensils",
  "WalletCards",
] as const;

const iconSet = new Set<string>(generatedAppIconNames);
const fieldTypes = new Set<GeneratedAppField["type"]>([
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "textarea",
]);
const componentTypes = new Set<GeneratedAppComponent["type"]>([
  "stats",
  "list",
  "table",
  "form",
  "progress",
  "checklist",
  "buttons",
  "tags",
  "chart",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanColor(value: unknown) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#8b5cf6";
}

function cleanIcon(value: unknown, fallback = "Sparkles") {
  const icon = typeof value === "string" ? value.trim() : "";
  return iconSet.has(icon) ? icon : fallback;
}

function cleanStringArray(value: unknown, fallback: string[] = [], maxItems = 8) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, 80));
  return items.length > 0 ? items : fallback;
}

function cleanRows(value: unknown, fallback: Array<Record<string, unknown>> = []) {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .filter(isRecord)
    .slice(0, 10)
    .map((row) =>
      Object.fromEntries(
        Object.entries(row)
          .slice(0, 8)
          .map(([key, item]) => [
            key.slice(0, 40),
            typeof item === "string" || typeof item === "number" || typeof item === "boolean"
              ? item
              : String(item ?? "").slice(0, 80),
          ]),
      ),
    );
  return rows.length > 0 ? rows : fallback;
}

function cleanFields(value: unknown): GeneratedAppField[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .slice(0, 8)
    .map((field) => {
      const type = fieldTypes.has(field.type as GeneratedAppField["type"])
        ? (field.type as GeneratedAppField["type"])
        : "text";
      return {
        label: cleanText(field.label, "Field", 60),
        type,
        placeholder: cleanText(field.placeholder, "", 80),
        options: cleanStringArray(field.options, [], 6),
      };
    });
}

function cleanComponents(value: unknown, fallbackFields: GeneratedAppField[]): GeneratedAppComponent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .slice(0, 12)
    .map((component) => {
      const type = componentTypes.has(component.type as GeneratedAppComponent["type"])
        ? (component.type as GeneratedAppComponent["type"])
        : "list";
      return {
        type,
        title: cleanText(component.title, titleForType(type), 80),
        description: cleanText(component.description, "", 160),
        fields: cleanFields(component.fields).slice(0, 8),
        items: cleanRows(component.items, []),
        actions: cleanStringArray(component.actions, type === "buttons" ? ["Add item"] : [], 5),
      };
    })
    .map((component) =>
      component.type === "form" && (!component.fields || component.fields.length === 0)
        ? { ...component, fields: fallbackFields }
        : component,
    );
}

function cleanSections(value: unknown, components: GeneratedAppComponent[]): GeneratedAppSection[] {
  if (!Array.isArray(value)) {
    return [{ title: "Overview", description: "", components }];
  }

  const sections = value
    .filter(isRecord)
    .slice(0, 6)
    .map((section) => {
      const sectionComponents = cleanComponents(section.components, []);
      return {
        title: cleanText(section.title, "Overview", 80),
        description: cleanText(section.description, "", 180),
        components: sectionComponents.length > 0 ? sectionComponents : components.slice(0, 3),
      };
    });

  return sections.length > 0 ? sections : [{ title: "Overview", description: "", components }];
}

function titleForType(type: GeneratedAppComponent["type"]) {
  const labels: Record<GeneratedAppComponent["type"], string> = {
    stats: "Snapshot",
    list: "List",
    table: "Table",
    form: "Quick add",
    progress: "Progress",
    checklist: "Checklist",
    buttons: "Actions",
    tags: "Tags",
    chart: "Chart",
  };
  return labels[type];
}

function starterForPrompt(prompt: string): GeneratedAppTemplate {
  const lower = prompt.toLowerCase();
  const isBudget = /budget|money|expense|finance|saving/.test(lower);
  const isMeal = /meal|food|recipe|diet|planner/.test(lower);
  const isStudy = /study|learn|course|exam|school/.test(lower);
  const appName = isBudget
    ? "Budget Tracker"
    : isMeal
      ? "Meal Planner"
      : isStudy
        ? "Study Planner"
        : "Habit Tracker";
  const icon = isBudget ? "PiggyBank" : isMeal ? "Utensils" : isStudy ? "GraduationCap" : "Flame";
  const color = isBudget ? "#10b981" : isMeal ? "#f97316" : isStudy ? "#6366f1" : "#f97316";
  const description = isBudget
    ? "Track spending, savings, and monthly goals."
    : isMeal
      ? "Plan weekly meals, groceries, and prep notes."
      : isStudy
        ? "Organize study sessions, subjects, and progress."
        : "Track habits, streaks, and weekly progress.";
  const fields: GeneratedAppField[] = [
    { label: "Name", type: "text", placeholder: "Add a new item" },
    { label: "Target date", type: "date" },
    { label: "Status", type: "select", options: ["Planned", "In progress", "Done"] },
  ];
  const sampleData = [
    { name: appName.replace(" Tracker", ""), status: "In progress", progress: 72 },
    { name: "Weekly review", status: "Planned", progress: 40 },
    { name: "Done item", status: "Done", progress: 100 },
  ];
  const components: GeneratedAppComponent[] = [
    { type: "stats", title: "Today", items: [{ label: "Active", value: 8 }, { label: "Done", value: 5 }, { label: "Progress", value: "72%" }] },
    { type: "form", title: "Quick add", fields, actions: ["Add item"] },
    { type: "checklist", title: "Focus list", items: sampleData },
    { type: "progress", title: "Weekly progress", items: sampleData },
    { type: "chart", title: "Trend", items: sampleData },
  ];

  return {
    appName,
    description,
    icon,
    color,
    layout: "single-page",
    sections: [{ title: "Workspace", description, components }],
    components,
    fields,
    actions: ["Add item", "Mark complete", "Review"],
    sampleData,
  };
}

export function normalizeGeneratedAppTemplate(input: unknown, prompt: string): GeneratedAppTemplate {
  const starter = starterForPrompt(prompt);
  const source = isRecord(input) ? input : {};
  const fields = cleanFields(source.fields);
  const normalizedFields = fields.length > 0 ? fields : starter.fields;
  const components = cleanComponents(source.components, normalizedFields);
  const normalizedComponents = components.length > 0 ? components : starter.components;
  const sampleData = cleanRows(source.sampleData, starter.sampleData);
  const template: GeneratedAppTemplate = {
    appName: cleanText(source.appName, starter.appName, 80),
    description: cleanText(source.description, starter.description, 220),
    icon: cleanIcon(source.icon, starter.icon),
    color: cleanColor(source.color ?? starter.color),
    layout: "single-page",
    sections: cleanSections(source.sections, normalizedComponents),
    components: normalizedComponents,
    fields: normalizedFields,
    actions: cleanStringArray(source.actions, starter.actions, 8),
    sampleData,
  };

  return {
    ...template,
    sections: template.sections.map((section) => ({
      ...section,
      components: section.components.length > 0 ? section.components : normalizedComponents,
    })),
  };
}
