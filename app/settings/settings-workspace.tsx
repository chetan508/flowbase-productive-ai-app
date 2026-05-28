"use client";

import { useClerk } from "@clerk/nextjs";
import {
  Bell,
  Bot,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Flag,
  Heart,
  Home,
  KeyRound,
  Lightbulb,
  NotebookPen,
  Palette,
  Pencil,
  Plus,
  Save,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Tag,
  Trash2,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition, type ElementType } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  exportUserDataAction,
  updateCategoryAction,
  updateSettingsAction,
  type SettingsPageData,
} from "@/app/settings/actions";
import { freePlanLimits } from "@/lib/plan-limits";
import { categoryIconNames, categoryScopes, type CategoryScope } from "@/lib/settings-options";
import {
  type CategoryRecord,
  type SettingsRecord,
} from "@/lib/settings";

type SectionId = "profile" | "subscription" | "categories" | "ai" | "preferences" | "export" | "privacy";

const sections: Array<{ id: SectionId; label: string; icon: ElementType }> = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "ai", label: "AI Settings", icon: Bot },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "export", label: "Export", icon: Download },
  { id: "privacy", label: "Privacy", icon: Shield },
];

const icons: Record<string, ElementType> = {
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  Home,
  Lightbulb,
  NotebookPen,
  Sparkles,
  Star,
  Tag,
};

const scopeLabels: Record<CategoryScope, string> = {
  calendar: "Calendar events",
  tasks: "Tasks / Kanban",
  notes: "Notes",
  reminders: "Reminders",
};

const aiModels = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash", "gpt-4.1-mini"];
const aiBehaviors = ["balanced", "concise", "creative", "analytical"];
const aiTones = ["warm", "professional", "friendly", "direct"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Tag;
  return <Icon aria-hidden="true" className={className} />;
}

export function SettingsWorkspace({ initialData }: { initialData: SettingsPageData }) {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [settings, setSettings] = useState(initialData.settings);
  const [categories, setCategories] = useState(initialData.categories);
  const [planTier, setPlanTier] = useState(initialData.planTier);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const usage = useMemo(
    () => ({
      ...initialData.usage,
      customCategories: categories.length,
    }),
    [categories, initialData.usage],
  );

  function saveSettings(input: Parameters<typeof updateSettingsAction>[0], message = "Settings saved.") {
    startTransition(async () => {
      try {
        const updated = await updateSettingsAction(input);
        setSettings(updated);
        setFeedback(message);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Settings update failed.");
      }
    });
  }

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-border/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Workspace control room</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Settings</h1>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm shadow-slate-200/60">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-cyan-100 text-cyan-700">
            <Sparkles aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 truncate">Preferences are saved for {settings.email}</span>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 py-5 xl:grid-cols-[238px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-white/80 bg-white/80 p-2 shadow-sm shadow-slate-200/60 xl:sticky xl:top-4 xl:self-start">
          <nav aria-label="Settings sections" className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const selected = activeSection === section.id;
              return (
                <button
                  aria-pressed={selected}
                  className={cx(
                    "flex h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium transition",
                    selected
                      ? "border-cyan-200 bg-cyan-50 text-slate-950"
                      : "border-transparent text-slate-600 hover:border-slate-100 hover:bg-white",
                  )}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-cyan-600" />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {activeSection === "profile" && (
            <ProfileSection settings={settings} disabled={isPending} onSave={saveSettings} />
          )}
          {activeSection === "subscription" && (
            <SubscriptionSection
              onPlanTierChange={setPlanTier}
              planTier={planTier}
              usage={usage}
            />
          )}
          {activeSection === "categories" && (
            <CategoriesSection
              categories={categories}
              disabled={isPending}
              isPro={planTier === "pro"}
              onChange={setCategories}
            />
          )}
          {activeSection === "ai" && (
            <AiSection
              disabled={isPending}
              isPro={planTier === "pro"}
              settings={settings}
              onSave={saveSettings}
            />
          )}
          {activeSection === "preferences" && (
            <PreferencesSection disabled={isPending} settings={settings} onSave={saveSettings} />
          )}
          {activeSection === "export" && <ExportSection isPro={planTier === "pro"} />}
          {activeSection === "privacy" && (
            <PrivacySection disabled={isPending} settings={settings} onSave={saveSettings} />
          )}
        </div>
      </div>

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

function SettingsCard({
  children,
  icon: Icon,
  kicker,
  title,
}: {
  children: React.ReactNode;
  icon: ElementType;
  kicker: string;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/80 bg-white/85 p-4 shadow-sm shadow-slate-200/60">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-cyan-700">{kicker}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileSection({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean;
  onSave: (input: Parameters<typeof updateSettingsAction>[0], message?: string) => void;
  settings: SettingsRecord;
}) {
  const initials = settings.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SettingsCard icon={UserRound} kicker="Profile" title="Your workspace identity">
      <form
        className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave(
            {
              displayName: String(formData.get("displayName") ?? ""),
              avatarUrl: String(formData.get("avatarUrl") ?? ""),
            },
            "Profile saved.",
          );
        }}
      >
        <div className="rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-4 text-center">
          <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-lg bg-slate-950 text-xl font-bold text-white">
            {settings.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={settings.avatarUrl} />
            ) : (
              initials || "FB"
            )}
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-slate-900">{settings.displayName}</p>
          <p className="truncate text-xs text-slate-500">{settings.email}</p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <TextField defaultValue={settings.displayName} label="Display name" name="displayName" required />
          <TextField defaultValue={settings.email} disabled label="Email" name="email" />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Avatar URL
            <input
              className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              defaultValue={settings.avatarUrl}
              name="avatarUrl"
              placeholder="https://..."
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <SaveButton disabled={disabled}>Save profile</SaveButton>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/user"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              Account security
            </a>
          </div>
        </div>
      </form>
    </SettingsCard>
  );
}

function SubscriptionSection({
  onPlanTierChange,
  planTier,
  usage,
}: {
  onPlanTierChange: (tier: "free" | "pro") => void;
  planTier: "free" | "pro";
  usage: SettingsPageData["usage"];
}) {
  const clerk = useClerk();
  const [status, setStatus] = useState("Checking subscription");
  const [renewal, setRenewal] = useState("Not available yet");
  const [billingReady, setBillingReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const proPlanId = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;

  useEffect(() => {
    let active = true;
    async function loadBilling() {
      try {
        const billing = (clerk as unknown as { billing?: Record<string, unknown> }).billing;
        if (!billing?.getSubscription) {
          if (active) setStatus("Clerk Billing is not enabled yet");
          return;
        }
        const subscription = await (billing.getSubscription as () => Promise<unknown>)();
        const item = Array.isArray((subscription as { items?: unknown[] })?.items)
          ? ((subscription as { items: unknown[] }).items[0] as Record<string, unknown> | undefined)
          : undefined;
        const planName = String(
          item?.planName ?? item?.plan?.["name" as never] ?? item?.plan?.["slug" as never] ?? "",
        ).toLowerCase();
        const itemStatus = String(item?.status ?? (subscription as { status?: string })?.status ?? "active");

        if (active) {
          setBillingReady(true);
          setStatus(itemStatus);
          if (planName.includes("pro")) onPlanTierChange("pro");
          if (item?.periodEnd) setRenewal(new Date(String(item.periodEnd)).toLocaleDateString());
        }
      } catch {
        if (active) setStatus("Subscription details are unavailable");
      }
    }

    void loadBilling();
    return () => {
      active = false;
    };
  }, [clerk, onPlanTierChange]);

  async function startProCheckout() {
    if (!proPlanId) return;
    setIsLoading(true);
    try {
      const billing = (clerk as unknown as { billing?: Record<string, unknown> }).billing;
      const checkout = await (billing?.startCheckout as ((params: unknown) => Promise<unknown>) | undefined)?.({
        planId: proPlanId,
        planPeriod: "month",
      });
      const target = checkout as Record<string, unknown> | undefined;
      if (typeof target?.redirect === "function") {
        await target.redirect();
      } else if (typeof target?.redirectUrl === "string") {
        window.location.href = target.redirectUrl;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SettingsCard icon={CreditCard} kicker="Subscription" title="Free or Pro access">
      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard
          active={planTier === "free"}
          description="Best for getting started with a calm personal workspace."
          name="Free"
          price="$0"
          rows={[
            `${freePlanLimits.customCategories} custom categories`,
            `${freePlanLimits.generatedApps} generated apps`,
            `${freePlanLimits.kanbanBoards} boards and ${freePlanLimits.spaces} spaces`,
            "Basic AI preferences",
          ]}
        />
        <PlanCard
          active={planTier === "pro"}
          description="Unlock AI controls, unlimited workspace objects, and export."
          name="Pro"
          price="Paid"
          rows={["Unlimited categories", "Unlimited boards, spaces, and apps", "All AI features", "Data export"]}
        />
      </div>
      <div className="mt-4 grid gap-3 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-4 md:grid-cols-4">
        <Metric label="Status" value={status} />
        <Metric label="Renewal" value={renewal} />
        <Metric label="Categories" value={`${usage.customCategories}/${planTier === "pro" ? "∞" : freePlanLimits.customCategories}`} />
        <Metric label="Generated apps" value={`${usage.generatedApps}/${planTier === "pro" ? "∞" : freePlanLimits.generatedApps}`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!proPlanId || !billingReady || isLoading || planTier === "pro"}
          onClick={startProCheckout}
          type="button"
        >
          <CreditCard aria-hidden="true" className="size-4" />
          {planTier === "pro" ? "Pro active" : "Upgrade Plan"}
        </button>
        {!proPlanId && (
          <p className="self-center text-sm text-slate-500">
            Add NEXT_PUBLIC_CLERK_PRO_PLAN_ID to enable checkout.
          </p>
        )}
      </div>
    </SettingsCard>
  );
}

function CategoriesSection({
  categories,
  disabled,
  isPro,
  onChange,
}: {
  categories: CategoryRecord[];
  disabled: boolean;
  isPro: boolean;
  onChange: (categories: CategoryRecord[]) => void;
}) {
  const [scope, setScope] = useState<CategoryScope>("tasks");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const limitReached = !isPro && categories.length >= freePlanLimits.customCategories;

  function run(action: () => Promise<CategoryRecord[]>, message: string) {
    setFeedback(null);
    void action()
      .then((nextCategories) => {
        onChange(nextCategories);
        setEditingId(null);
        setFeedback(message);
      })
      .catch((error) => setFeedback(error instanceof Error ? error.message : "Category update failed."));
  }

  return (
    <SettingsCard icon={Tag} kicker="Categories" title="Custom labels for your workflow">
      <div className="mb-4 flex flex-wrap gap-2">
        {categoryScopes.map((item) => (
          <button
            aria-pressed={scope === item}
            className={cx(
              "h-9 rounded-md border px-3 text-sm font-medium transition",
              scope === item
                ? "border-cyan-200 bg-cyan-50 text-cyan-900"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            key={item}
            onClick={() => setScope(item)}
            type="button"
          >
            {scopeLabels[item]}
          </button>
        ))}
      </div>

      <form
        className="grid gap-2 rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-3 md:grid-cols-[minmax(160px,1fr)_120px_150px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          run(
            () =>
              createCategoryAction({
                scope,
                name: String(formData.get("name") ?? ""),
                color: String(formData.get("color") ?? "#38bdf8"),
                icon: String(formData.get("icon") ?? "Tag"),
              }),
            "Category created.",
          );
          form.reset();
        }}
      >
        <input
          className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
          disabled={disabled || limitReached}
          name="name"
          placeholder={`New ${scopeLabels[scope].toLowerCase()} category`}
          required
        />
        <input
          aria-label="Category color"
          className="h-10 rounded-md border border-slate-200 bg-white px-2"
          defaultValue="#38bdf8"
          disabled={disabled || limitReached}
          name="color"
          type="color"
        />
        <select
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400"
          disabled={disabled || limitReached}
          name="icon"
        >
          {categoryIconNames.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          disabled={disabled || limitReached}
          type="submit"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add
        </button>
      </form>

      {limitReached && (
        <p className="mt-2 text-sm text-amber-700">Free plan category limit reached. Upgrade to Pro for unlimited categories.</p>
      )}
      {feedback && <p className="mt-2 text-sm text-slate-500">{feedback}</p>}

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {categories
          .filter((category) => category.scope === scope)
          .map((category) => (
            <form
              className="min-w-0 rounded-lg border border-slate-100 bg-white p-3"
              key={category.id}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                run(
                  () =>
                    updateCategoryAction(category.id, {
                      name: String(formData.get("name") ?? ""),
                      color: String(formData.get("color") ?? category.color),
                      icon: String(formData.get("icon") ?? category.icon),
                    }),
                  "Category saved.",
                );
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <CategoryIcon className="size-5" name={category.icon} />
                </span>
                {editingId === category.id ? (
                  <input
                    className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-cyan-400"
                    defaultValue={category.name}
                    name="name"
                    required
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                    <p className="truncate text-xs text-slate-500">{category.icon}</p>
                  </div>
                )}
                <button
                  aria-label={`Edit ${category.name}`}
                  className="grid size-8 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setEditingId(editingId === category.id ? null : category.id)}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label={`Delete ${category.name}`}
                  className="grid size-8 place-items-center rounded-md border border-rose-100 text-rose-600 transition hover:bg-rose-50"
                  onClick={() => run(() => deleteCategoryAction(category.id), "Category deleted.")}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              {editingId === category.id && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                  <input aria-label="Color" defaultValue={category.color} name="color" type="color" />
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                    defaultValue={category.icon}
                    name="icon"
                  >
                    {categoryIconNames.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <SaveButton disabled={disabled} small>
                    Save
                  </SaveButton>
                </div>
              )}
            </form>
          ))}
      </div>
    </SettingsCard>
  );
}

function AiSection({
  disabled,
  isPro,
  onSave,
  settings,
}: {
  disabled: boolean;
  isPro: boolean;
  onSave: (input: Parameters<typeof updateSettingsAction>[0], message?: string) => void;
  settings: SettingsRecord;
}) {
  const ai = settings.aiSettings;
  return (
    <SettingsCard icon={WandSparkles} kicker="AI" title="Model, tone, and assistant behavior">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave(
            {
              aiSettings: {
                model: String(formData.get("model") ?? ai.model),
                behavior: String(formData.get("behavior") ?? ai.behavior),
                tone: String(formData.get("tone") ?? ai.tone),
                features: {
                  refine: formData.has("refine"),
                  assistant: formData.has("assistant"),
                  templateBuilder: formData.has("templateBuilder"),
                  summaries: formData.has("summaries"),
                },
              },
            },
            "AI settings saved.",
          );
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField defaultValue={ai.model} label="Preferred model" name="model" options={aiModels} />
          <SelectField defaultValue={ai.behavior} label="Default behavior" name="behavior" options={aiBehaviors} />
          <SelectField defaultValue={ai.tone} label="Tone / style" name="tone" options={aiTones} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Toggle defaultChecked={ai.features.refine} disabled={!isPro} label="AI Refine" name="refine" />
          <Toggle defaultChecked={ai.features.assistant} label="AI Assistant" name="assistant" />
          <Toggle defaultChecked={ai.features.templateBuilder} disabled={!isPro} label="AI Template Builder" name="templateBuilder" />
          <Toggle defaultChecked={ai.features.summaries} disabled={!isPro} label="AI summaries" name="summaries" />
        </div>
        {!isPro && <p className="text-sm text-amber-700">Free plan keeps core assistant settings available. Pro unlocks every AI feature toggle.</p>}
        <SaveButton disabled={disabled}>Save AI settings</SaveButton>
      </form>
    </SettingsCard>
  );
}

function PreferencesSection({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean;
  onSave: (input: Parameters<typeof updateSettingsAction>[0], message?: string) => void;
  settings: SettingsRecord;
}) {
  return (
    <SettingsCard icon={Palette} kicker="Preferences" title="Defaults and notifications">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave(
            {
              theme: String(formData.get("theme") ?? "system"),
              defaultCalendarView: String(formData.get("defaultCalendarView") ?? "month"),
              defaultTaskPriority: String(formData.get("defaultTaskPriority") ?? "Medium"),
              autoSave: formData.has("autoSave"),
              notificationSettings: {
                email: formData.has("email"),
                desktop: formData.has("desktop"),
                reminders: formData.has("reminders"),
                digest: formData.has("digest"),
              },
            },
            "Preferences saved.",
          );
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField defaultValue={settings.theme} label="Theme" name="theme" options={["system", "light", "dark"]} />
          <SelectField defaultValue={settings.defaultCalendarView} label="Default calendar view" name="defaultCalendarView" options={["month", "week"]} />
          <SelectField defaultValue={settings.defaultTaskPriority} label="Default task priority" name="defaultTaskPriority" options={["Low", "Medium", "High"]} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Toggle defaultChecked={settings.autoSave} label="Auto-save changes" name="autoSave" />
          <Toggle defaultChecked={settings.notificationSettings.email} label="Email notifications" name="email" />
          <Toggle defaultChecked={settings.notificationSettings.desktop} label="Desktop notifications" name="desktop" />
          <Toggle defaultChecked={settings.notificationSettings.reminders} label="Reminder alerts" name="reminders" />
          <Toggle defaultChecked={settings.notificationSettings.digest} label="Daily digest" name="digest" />
        </div>
        <SaveButton disabled={disabled}>Save preferences</SaveButton>
      </form>
    </SettingsCard>
  );
}

function ExportSection({ isPro }: { isPro: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <SettingsCard icon={Download} kicker="Data" title="Export workspace settings">
      <div className="rounded-lg border border-slate-100 bg-[color:var(--soft-panel)] p-4">
        <p className="text-sm leading-6 text-slate-600">
          Export your profile preferences, category setup, and usage snapshot as JSON.
        </p>
        <button
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isPro}
          onClick={async () => {
            try {
              const data = await exportUserDataAction();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "flowbase-settings-export.json";
              anchor.click();
              URL.revokeObjectURL(url);
              setMessage("Export downloaded.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Export failed.");
            }
          }}
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          Export data
        </button>
        {!isPro && <p className="mt-2 text-sm text-amber-700">Data export is available on Pro.</p>}
        {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
      </div>
    </SettingsCard>
  );
}

function PrivacySection({
  disabled,
  onSave,
  settings,
}: {
  disabled: boolean;
  onSave: (input: Parameters<typeof updateSettingsAction>[0], message?: string) => void;
  settings: SettingsRecord;
}) {
  return (
    <SettingsCard icon={Shield} kicker="Privacy" title="Security and data controls">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onSave(
            {
              privacySettings: {
                twoFactorReminder: formData.has("twoFactorReminder"),
                privateProfile: formData.has("privateProfile"),
                dataSharing: formData.has("dataSharing"),
              },
            },
            "Privacy settings saved.",
          );
        }}
      >
        <div className="grid gap-2">
          <Toggle defaultChecked={settings.privacySettings.twoFactorReminder} label="Remind me to review two-factor security" name="twoFactorReminder" />
          <Toggle defaultChecked={settings.privacySettings.privateProfile} label="Keep profile details private to collaborators" name="privateProfile" />
          <Toggle defaultChecked={settings.privacySettings.dataSharing} label="Share anonymized product usage signals" name="dataSharing" />
        </div>
        <SaveButton disabled={disabled}>Save privacy settings</SaveButton>
      </form>
    </SettingsCard>
  );
}

function PlanCard({
  active,
  description,
  name,
  price,
  rows,
}: {
  active: boolean;
  description: string;
  name: string;
  price: string;
  rows: string[];
}) {
  return (
    <article className={cx("rounded-lg border p-4", active ? "border-cyan-200 bg-cyan-50" : "border-slate-100 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{name}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">{price}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li className="flex items-center gap-2 text-sm text-slate-700" key={row}>
            <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
            <span>{row}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TextField({
  defaultValue,
  disabled,
  label,
  name,
  required,
}: {
  defaultValue?: string;
  disabled?: boolean;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        required={required}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm capitalize outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  defaultChecked,
  disabled,
  label,
  name,
}: {
  defaultChecked: boolean;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <span className="min-w-0 truncate">{label}</span>
      <input
        className="size-4 shrink-0 accent-slate-950 disabled:opacity-50"
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        type="checkbox"
      />
    </label>
  );
}

function SaveButton({
  children,
  disabled,
  small,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60",
        small ? "h-9" : "h-10",
      )}
      disabled={disabled}
      type="submit"
    >
      <Save aria-hidden="true" className="size-4" />
      {children}
    </button>
  );
}
