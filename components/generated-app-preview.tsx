"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { GeneratedAppComponent, GeneratedAppField, GeneratedAppTemplate } from "@/db";
import { GeneratedAppIcon } from "@/components/generated-app-icon";

type AppRecord = Record<string, string | number | boolean>;

function textValue(value: unknown, fallback = "") {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function normalizeRecord(row: Record<string, unknown>, index: number): AppRecord {
  const normalized = Object.fromEntries(
    Object.entries(row)
      .slice(0, 8)
      .map(([key, value]) => [
        key,
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? value
          : textValue(value, ""),
      ]),
  ) as AppRecord;

  return {
    id: textValue(normalized.id, `item-${index + 1}`),
    name: textValue(normalized.name ?? normalized.label ?? normalized.title, `Item ${index + 1}`),
    status: textValue(normalized.status, index === 0 ? "In progress" : "Planned"),
    progress: Number(normalized.progress ?? normalized.value ?? 40 + index * 18),
    ...normalized,
  };
}

function seedItems(template: GeneratedAppTemplate) {
  const source =
    template.sampleData.length > 0
      ? template.sampleData
      : [
          { name: "Plan", status: "In progress", progress: 72 },
          { name: "Review", status: "Planned", progress: 45 },
          { name: "Ship", status: "Done", progress: 100 },
        ];

  return source.slice(0, 12).map(normalizeRecord);
}

function itemLabel(item: AppRecord, fallback: string) {
  return textValue(item.name ?? item.label ?? item.title, fallback);
}

function itemMeta(item: AppRecord) {
  return textValue(item.status ?? item.category ?? item.type ?? item.date, "");
}

function itemProgress(item: AppRecord, fallback = 60) {
  const raw = Number(item.progress ?? item.value ?? fallback);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : fallback;
}

function primaryField(fields: GeneratedAppField[]) {
  return fields.find((field) => field.type !== "checkbox")?.label || "Name";
}

function rowsFor(component: GeneratedAppComponent, items: AppRecord[]) {
  if (items.length > 0) return items;
  return (component.items ?? []).slice(0, 8).map(normalizeRecord);
}

function StatsBlock({ items, template }: { items: AppRecord[]; template: GeneratedAppTemplate }) {
  const done = items.filter((item) => String(item.status).toLowerCase() === "done").length;
  const average = Math.round(items.reduce((sum, item) => sum + itemProgress(item, 0), 0) / Math.max(items.length, 1));
  const stats = [
    { label: "Items", value: items.length },
    { label: "Done", value: done },
    { label: "Active", value: Math.max(items.length - done, 0) },
    { label: "Progress", value: `${average}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 min-[920px]:grid-cols-4">
      {stats.map((item) => (
        <div className="min-w-0 rounded-lg border border-slate-100 bg-white/82 p-3 shadow-sm shadow-slate-200/50" key={item.label}>
          <p className="truncate text-xs font-medium text-slate-500">{item.label}</p>
          <p className="mt-2 truncate text-xl font-semibold text-slate-950 sm:text-2xl">{item.value}</p>
          <div className="mt-2 h-1 rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${item.label === "Progress" ? average : 100}%`, backgroundColor: template.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListBlock({ items, template }: { items: AppRecord[]; template: GeneratedAppTemplate }) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item, index) => (
        <div className="flex min-h-11 items-center gap-3 rounded-md border border-slate-100 bg-[color:var(--soft-panel)] px-3 py-2" key={textValue(item.id, `${index}`)}>
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: template.color }} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{itemLabel(item, `Item ${index + 1}`)}</p>
            {itemMeta(item) && <p className="truncate text-xs text-slate-500">{itemMeta(item)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableBlock({ items }: { items: AppRecord[] }) {
  const columns = Array.from(new Set(items.flatMap((row) => Object.keys(row).filter((key) => key !== "id")))).slice(0, 5);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="min-w-[520px] divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-400">
          <tr>{columns.map((column) => <th className="px-3 py-2" key={column}>{titleCase(column)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white/80">
          {items.slice(0, 7).map((row, rowIndex) => (
            <tr key={textValue(row.id, `${rowIndex}`)}>
              {columns.map((column) => (
                <td className="max-w-44 truncate px-3 py-2 text-slate-700" key={column}>
                  {textValue(row[column], "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormBlock({
  component,
  onAdd,
  template,
}: {
  component: GeneratedAppComponent;
  onAdd: (row: AppRecord) => void;
  template: GeneratedAppTemplate;
}) {
  const fields = (component.fields?.length ? component.fields : template.fields).slice(0, 6);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row: AppRecord = {
      id: `item-${Date.now()}`,
      status: "Planned",
      progress: 10,
    };

    fields.forEach((field) => {
      const key = field.label;
      if (field.type === "checkbox") {
        row[key] = form.get(key) === "on";
      } else {
        row[key] = textValue(form.get(key), "");
      }
    });

    const mainKey = primaryField(fields);
    row.name = textValue(row[mainKey], "New item");
    onAdd(row);
    event.currentTarget.reset();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label className={field.type === "textarea" ? "block sm:col-span-2" : "block"} key={field.label}>
            <span className="text-xs font-medium text-slate-600">{field.label}</span>
            {field.type === "textarea" ? (
              <textarea className="mt-1 min-h-20 w-full resize-y rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" name={field.label} placeholder={field.placeholder} />
            ) : field.type === "select" ? (
              <select className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white/90 px-3 text-sm text-slate-700 outline-none focus:border-violet-300" name={field.label}>
                {(field.options?.length ? field.options : ["Planned", "In progress", "Done"]).map((option) => <option key={option}>{option}</option>)}
              </select>
            ) : field.type === "checkbox" ? (
              <span className="mt-2 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white/90 px-3 text-sm text-slate-600">
                <input className="size-4 accent-slate-950" name={field.label} type="checkbox" /> Enabled
              </span>
            ) : (
              <input className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white/90 px-3 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" name={field.label} placeholder={field.placeholder} type={field.type} />
            )}
          </label>
        ))}
      </div>
      <button className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-white shadow-sm transition hover:brightness-95" style={{ backgroundColor: template.color }} type="submit">
        Add item
      </button>
    </form>
  );
}

function ProgressBlock({
  items,
  onProgress,
  template,
}: {
  items: AppRecord[];
  onProgress: (id: string, delta: number) => void;
  template: GeneratedAppTemplate;
}) {
  return (
    <div className="space-y-3">
      {items.slice(0, 7).map((item, index) => {
        const id = textValue(item.id, `${index}`);
        const progress = itemProgress(item, 50 + index * 10);
        return (
          <div key={id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-700">{itemLabel(item, `Goal ${index + 1}`)}</span>
              <span className="shrink-0 text-xs text-slate-500">{progress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Decrease progress" className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-600" onClick={() => onProgress(id, -10)} type="button">-</button>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-[width]" style={{ width: `${progress}%`, backgroundColor: template.color }} />
              </div>
              <button aria-label="Increase progress" className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-600" onClick={() => onProgress(id, 10)} type="button">+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistBlock({
  items,
  onToggle,
  template,
}: {
  items: AppRecord[];
  onToggle: (id: string) => void;
  template: GeneratedAppTemplate;
}) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item, index) => {
        const id = textValue(item.id, `${index}`);
        const done = String(item.status ?? "").toLowerCase() === "done";
        return (
          <button className="flex w-full items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100" key={id} onClick={() => onToggle(id)} type="button">
            <span className="grid size-5 shrink-0 place-items-center rounded border border-slate-200 bg-white">
              {done && <span className="size-2.5 rounded-sm" style={{ backgroundColor: template.color }} />}
            </span>
            <span className={`min-w-0 truncate ${done ? "text-slate-400 line-through" : ""}`}>{itemLabel(item, `Task ${index + 1}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

function ButtonsBlock({
  component,
  onAction,
  template,
}: {
  component: GeneratedAppComponent;
  onAction: (action: string) => void;
  template: GeneratedAppTemplate;
}) {
  const actions = (component.actions?.length ? component.actions : template.actions).slice(0, 5);
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <button
          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-white shadow-sm transition hover:brightness-95"
          key={action}
          onClick={() => onAction(action)}
          style={{ backgroundColor: index === 0 ? template.color : "#0f172a" }}
          type="button"
        >
          {action}
        </button>
      ))}
    </div>
  );
}

function TagsBlock({ items }: { items: AppRecord[] }) {
  const labels = items.slice(0, 10).map((item, index) => itemMeta(item) || itemLabel(item, `Tag ${index + 1}`));
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from(new Set(labels)).map((label) => (
        <span className="rounded-md border border-slate-100 bg-white/85 px-2.5 py-1 text-xs font-medium text-slate-700" key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

function ChartBlock({ items, template }: { items: AppRecord[]; template: GeneratedAppTemplate }) {
  return (
    <div className="flex h-44 min-w-0 items-end gap-2 rounded-lg border border-dashed border-slate-200 bg-white/60 p-3">
      {items.slice(0, 7).map((item, index) => (
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={textValue(item.id, `${index}`)}>
          <div
            className="w-full rounded-t-md transition-[height]"
            style={{
              height: `${Math.max(18, itemProgress(item, 35 + index * 8))}%`,
              backgroundColor: template.color,
              opacity: 0.45 + index * 0.06,
            }}
          />
          <span className="w-full truncate text-center text-[10px] text-slate-500">{itemLabel(item, `${index + 1}`)}</span>
        </div>
      ))}
    </div>
  );
}

function ComponentBlock({
  component,
  items,
  onAction,
  onAdd,
  onProgress,
  onToggle,
  template,
}: {
  component: GeneratedAppComponent;
  items: AppRecord[];
  onAction: (action: string) => void;
  onAdd: (row: AppRecord) => void;
  onProgress: (id: string, delta: number) => void;
  onToggle: (id: string) => void;
  template: GeneratedAppTemplate;
}) {
  const componentRows = rowsFor(component, items);
  const body =
    component.type === "stats" ? (
      <StatsBlock items={componentRows} template={template} />
    ) : component.type === "table" ? (
      <TableBlock items={componentRows} />
    ) : component.type === "form" ? (
      <FormBlock component={component} onAdd={onAdd} template={template} />
    ) : component.type === "progress" ? (
      <ProgressBlock items={componentRows} onProgress={onProgress} template={template} />
    ) : component.type === "checklist" ? (
      <ChecklistBlock items={componentRows} onToggle={onToggle} template={template} />
    ) : component.type === "buttons" ? (
      <ButtonsBlock component={component} onAction={onAction} template={template} />
    ) : component.type === "tags" ? (
      <TagsBlock items={componentRows} />
    ) : component.type === "chart" ? (
      <ChartBlock items={componentRows} template={template} />
    ) : (
      <ListBlock items={componentRows} template={template} />
    );

  return (
    <article className="min-w-0 rounded-lg border border-white/80 bg-white/84 p-3 shadow-sm shadow-slate-200/60 sm:p-4">
      {(component.title || component.description) && (
        <div className="mb-3 min-w-0">
          {component.title && <h3 className="truncate text-sm font-semibold text-slate-950">{component.title}</h3>}
          {component.description && <p className="mt-1 text-xs leading-5 text-slate-500">{component.description}</p>}
        </div>
      )}
      {body}
    </article>
  );
}

export function GeneratedAppPreview({
  compact = false,
  storageKey,
  template,
}: {
  compact?: boolean;
  storageKey?: string;
  template: GeneratedAppTemplate;
}) {
  const [items, setItems] = useState<AppRecord[]>(() => seedItems(template));
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sections = useMemo(
    () => (template.sections.length > 0 ? template.sections : [{ title: "Overview", description: template.description, components: template.components }]),
    [template],
  );

  useEffect(() => {
    if (!storageKey) {
      setItems(seedItems(template));
      setMessage(null);
      setHydrated(true);
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item)).map(normalizeRecord));
          setHydrated(true);
          setMessage(null);
          return;
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setItems(seedItems(template));
    setMessage(null);
    setHydrated(true);
  }, [storageKey, template]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [hydrated, items, storageKey]);

  function addItem(row: AppRecord) {
    setItems((current) => [normalizeRecord(row, current.length), ...current].slice(0, 16));
    setMessage("Item added.");
  }

  function toggleItem(id: string) {
    setItems((current) =>
      current.map((item) =>
        textValue(item.id) === id
          ? { ...item, status: String(item.status).toLowerCase() === "done" ? "In progress" : "Done", progress: String(item.status).toLowerCase() === "done" ? Math.min(itemProgress(item), 80) : 100 }
          : item,
      ),
    );
  }

  function updateProgress(id: string, delta: number) {
    setItems((current) =>
      current.map((item) =>
        textValue(item.id) === id ? { ...item, progress: Math.max(0, Math.min(100, itemProgress(item) + delta)) } : item,
      ),
    );
  }

  function runAction(action: string) {
    const lower = action.toLowerCase();
    if (lower.includes("complete") || lower.includes("done")) {
      setItems((current) => current.map((item, index) => (index === 0 ? { ...item, status: "Done", progress: 100 } : item)));
      setMessage("Top item marked complete.");
      return;
    }
    if (lower.includes("reset")) {
      setItems(seedItems(template));
      setMessage("Template data reset.");
      return;
    }
    addItem({ name: action, status: "Planned", progress: 10 });
  }

  return (
    <div className={`min-w-0 rounded-lg border border-white/80 bg-white/70 shadow-sm shadow-slate-200/60 ${compact ? "p-3" : "p-3 sm:p-5"}`}>
      <header className="flex min-w-0 flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: template.color }}>
            <GeneratedAppIcon className="size-5" name={template.icon} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{template.appName}</h2>
            <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-slate-500">{template.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" onClick={() => setItems(seedItems(template))} type="button">
            Reset
          </button>
          <span className="w-fit rounded-md border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
            {items.length} items
          </span>
        </div>
      </header>

      {message && (
        <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {message}
        </div>
      )}

      <div className={compact ? "mt-3 space-y-3" : "mt-4 space-y-4"}>
        {sections.map((section, sectionIndex) => (
          <section className="min-w-0" key={`${section.title}-${sectionIndex}`}>
            <div className="mb-3 min-w-0">
              <h3 className="truncate text-base font-semibold text-slate-950">{section.title}</h3>
              {section.description && <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>}
            </div>
            <div className={compact ? "grid min-w-0 gap-3" : "grid min-w-0 grid-cols-1 gap-3 min-[980px]:grid-cols-2 2xl:grid-cols-3"}>
              {(section.components.length > 0 ? section.components : template.components).map((component, componentIndex) => (
                <ComponentBlock
                  component={component}
                  items={items}
                  key={`${component.type}-${component.title}-${componentIndex}`}
                  onAction={runAction}
                  onAdd={addItem}
                  onProgress={updateProgress}
                  onToggle={toggleItem}
                  template={template}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
