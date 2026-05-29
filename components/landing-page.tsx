import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Gauge,
  Github,
  Globe2,
  LayoutDashboard,
  Linkedin,
  NotebookPen,
  PenTool,
  Play,
  Presentation,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Twitter,
  Users2,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "AI Assistant",
    description: "Plan work, summarize notes, generate next steps, and move ideas into action.",
    icon: Bot,
    tone: "from-rose-50 to-white text-rose-600 border-rose-100",
  },
  {
    title: "Smart Dashboard",
    description: "See your notes, tasks, calendar, templates, and progress in one calm command center.",
    icon: LayoutDashboard,
    tone: "from-sky-50 to-white text-sky-600 border-sky-100",
  },
  {
    title: "Calendar & Reminders",
    description: "Schedule deadlines, reminders, and focus blocks without leaving your workspace.",
    icon: CalendarDays,
    tone: "from-emerald-50 to-white text-emerald-600 border-emerald-100",
  },
  {
    title: "Kanban / Task Boards",
    description: "Turn plans into boards with priorities, comments, ownership, and progress tracking.",
    icon: ClipboardList,
    tone: "from-amber-50 to-white text-amber-600 border-amber-100",
  },
  {
    title: "Notion-style Notes",
    description: "Capture structured pages, project docs, briefs, and meeting notes with a rich editor.",
    icon: NotebookPen,
    tone: "from-violet-50 to-white text-violet-600 border-violet-100",
  },
  {
    title: "Miro-style Whiteboard",
    description: "Map ideas, diagrams, journeys, and systems visually with flexible whiteboards.",
    icon: Workflow,
    tone: "from-cyan-50 to-white text-cyan-600 border-cyan-100",
  },
  {
    title: "AI Template Builder",
    description: "Generate reusable mini tools and workflows for repeatable team processes.",
    icon: WandSparkles,
    tone: "from-fuchsia-50 to-white text-fuchsia-600 border-fuchsia-100",
  },
  {
    title: "Live Collaboration",
    description: "Work together with shared boards, live presence, comments, and synced updates.",
    icon: Users2,
    tone: "from-indigo-50 to-white text-indigo-600 border-indigo-100",
  },
  {
    title: "Custom Categories",
    description: "Shape your workspace with color-coded categories, settings, and team conventions.",
    icon: Settings2,
    tone: "from-teal-50 to-white text-teal-600 border-teal-100",
  },
];

const aiFeatures = [
  "Ask AI to create tasks",
  "Add calendar reminders",
  "Refine note content",
  "Generate diagrams",
  "Build mini apps/templates",
  "Get productivity insights",
];

const useCases = [
  { title: "Founders", description: "Run operating rhythms, investor notes, launches, and hiring pipelines.", icon: Rocket },
  { title: "Students", description: "Organize classes, assignments, research, study plans, and reminders.", icon: Presentation },
  { title: "Teams", description: "Coordinate shared projects with live boards, notes, decisions, and ownership.", icon: Users2 },
  { title: "Creators", description: "Plan content calendars, scripts, campaigns, ideas, and reusable templates.", icon: PenTool },
  { title: "Project managers", description: "Track tasks, milestones, dependencies, meetings, and delivery status.", icon: Gauge },
  { title: "Personal productivity", description: "Build a clean system for goals, routines, notes, and weekly planning.", icon: Sparkles },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals starting a smarter workspace.",
    features: ["Notes and tasks", "Basic calendar", "3 whiteboards", "AI assistant trial"],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$16",
    description: "For power users building a complete AI productivity system.",
    features: ["Unlimited notes and boards", "Advanced AI assistant", "AI template builder", "Productivity insights"],
    cta: "Get Pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$39",
    description: "For teams collaborating across projects and workflows.",
    features: ["Shared workspaces", "Live collaboration", "Admin controls", "Priority support"],
    cta: "Start team trial",
  },
];

const testimonials = [
  {
    quote: "Flowbase finally gives our strategy, execution, and notes one shared home. The AI layer makes planning feel lighter.",
    name: "Maya Chen",
    role: "Founder, Northstar Labs",
  },
  {
    quote: "We replaced scattered docs, boards, and reminders with a workspace the whole team can understand in minutes.",
    name: "Daniel Reed",
    role: "Product Lead, ClarityOps",
  },
  {
    quote: "The combination of whiteboards, tasks, and AI templates is exactly what our creative process was missing.",
    name: "Amara Singh",
    role: "Creative Director, Studio Relay",
  },
];

const faqs = [
  {
    question: "What can the AI Assistant help with?",
    answer: "It can draft tasks, summarize notes, refine writing, suggest next steps, create reminders, and surface productivity insights from your workspace.",
  },
  {
    question: "Does Flowbase support real-time collaboration?",
    answer: "Yes. The app is designed for shared boards, live presence, task comments, and team workspace updates powered by real-time collaboration infrastructure.",
  },
  {
    question: "Can I use Flowbase for structured notes?",
    answer: "Yes. Flowbase includes a Notion-style notes experience for project docs, meeting notes, briefs, research, and personal knowledge systems.",
  },
  {
    question: "Is there a visual whiteboard?",
    answer: "Yes. Flowbase includes a Miro-style whiteboard for diagrams, planning maps, brainstorming, and visual collaboration.",
  },
  {
    question: "What is the AI Template Builder?",
    answer: "It helps generate reusable mini apps and templates so recurring workflows can become guided tools inside your workspace.",
  },
  {
    question: "How does Flowbase handle data privacy?",
    answer: "The product should be configured with secure authentication, scoped user data, and team access controls. Production privacy terms can be linked once finalized.",
  },
];

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Showcase", href: "#showcase" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f5fbfd_0%,#ffffff_40%,#f7fbff_100%)] text-slate-950">
      <Navbar />
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
      <ProductShowcase />
      <AIWorkflowSection />
      <CollaborationSection />
      <UseCasesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/78 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2" href="/">
          <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white shadow-sm shadow-cyan-200">
            <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
          </span>
          <span className="text-base font-semibold tracking-tight">Flowbase</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="pressable hidden rounded-lg bg-white text-slate-700 shadow-none ring-1 ring-slate-200 hover:bg-slate-50 sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="pressable rounded-lg bg-slate-950 text-white shadow-sm hover:bg-slate-800">
            <Link href="/sign-up">
              Get Started
              <ArrowRight aria-hidden="true" className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.16),transparent_26%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.12),transparent_34%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
            <Zap aria-hidden="true" className="size-4 text-amber-500" />
            AI-first productivity for modern teams
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
            Your AI-Powered Workspace for Notes, Tasks, Whiteboards, and Team Collaboration
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Flowbase brings your dashboard, calendar, kanban boards, rich notes, visual whiteboards, AI assistant, templates, and live collaboration into one premium workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="pressable h-11 rounded-lg bg-slate-950 px-6 text-white shadow-sm shadow-slate-300 hover:bg-slate-800">
              <Link href="/sign-up">
                Get Started
                <ArrowRight aria-hidden="true" className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild className="pressable h-11 rounded-lg border-slate-200 bg-white/80 px-6 text-slate-800 shadow-sm hover:bg-white" variant="outline">
              <a href="#showcase">
                <Play aria-hidden="true" className="mr-2 size-4 text-cyan-600" />
                Watch Demo
              </a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {["AI Assistant", "Real-time Collaboration", "Smart Workspace"].map((badge) => (
              <span className="rounded-full border border-white/90 bg-white/75 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={120}>
          <HeroDashboardMockup />
        </Reveal>
      </div>
    </section>
  );
}

function HeroDashboardMockup() {
  return (
    <div className="hero-float rounded-[1.25rem] border border-white/90 bg-white/78 p-3 shadow-[0_30px_100px_rgba(15,23,42,0.14)] backdrop-blur-xl">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
        <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-slate-900 px-4">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs font-medium text-slate-400">flowbase.ai/workspace</span>
        </div>
        <div className="grid gap-3 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.22),transparent_24%),#f8fbff] p-4 md:grid-cols-[160px_1fr]">
          <aside className="hidden rounded-lg border border-cyan-100 bg-white/80 p-3 md:block">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-slate-950 text-amber-300">
                <Sparkles aria-hidden="true" className="size-4" />
              </span>
              <div>
                <div className="h-2.5 w-16 rounded bg-slate-800" />
                <div className="mt-1.5 h-2 w-20 rounded bg-slate-200" />
              </div>
            </div>
            {[
              ["Dashboard", "bg-sky-50 text-sky-600"],
              ["Assistant", "bg-rose-50 text-rose-600"],
              ["Calendar", "bg-emerald-50 text-emerald-600"],
              ["Kanban", "bg-amber-50 text-amber-600"],
              ["Notes", "bg-violet-50 text-violet-600"],
            ].map(([label, tone]) => (
              <div className="mb-1.5 flex h-8 items-center gap-2 rounded-md bg-white px-2 text-xs font-medium text-slate-600 shadow-sm" key={label}>
                <span className={cn("size-5 rounded", tone)} />
                {label}
              </div>
            ))}
          </aside>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Today", "12 tasks", "bg-sky-50 text-sky-600"],
                ["AI plans", "8 drafts", "bg-rose-50 text-rose-600"],
                ["Progress", "74%", "bg-emerald-50 text-emerald-600"],
              ].map(([label, value, tone]) => (
                <div className="ui-card ui-card-hover p-3" key={label}>
                  <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-medium", tone)}>{label}</span>
                  <p className="mt-4 text-xl font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-lg border border-white bg-white/90 p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Launch board</p>
                  <Users2 aria-hidden="true" className="size-4 text-cyan-500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Brief", "Design", "Ship"].map((column, columnIndex) => (
                    <div className="rounded-md bg-slate-50 p-2" key={column}>
                      <p className="mb-2 text-[11px] font-semibold text-slate-500">{column}</p>
                      {Array.from({ length: columnIndex + 2 }, (_, index) => (
                        <div className="mb-2 rounded-md border border-slate-100 bg-white p-2 text-[11px] text-slate-600 shadow-sm" key={index}>
                          <div className="h-2 w-4/5 rounded bg-slate-200" />
                          <div className="mt-2 h-2 w-1/2 rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-white bg-white/90 p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Bot aria-hidden="true" className="size-4 text-rose-500" />
                  <p className="text-sm font-semibold text-slate-900">AI assistant</p>
                </div>
                <div className="rounded-md bg-rose-50 p-3 text-xs leading-5 text-slate-700">
                  I turned the launch notes into 6 tasks, 2 reminders, and a stakeholder update.
                </div>
                <div className="mt-3 space-y-2">
                  {["Create tasks", "Schedule review", "Draft update"].map((item) => (
                    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5 text-xs text-slate-600" key={item}>
                      <Check aria-hidden="true" className="size-3.5 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase text-cyan-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </Reveal>
  );
}

function FeatureSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" id="features">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Feature highlights"
          title="Everything your productivity system needs, woven together"
          description="Flowbase combines the tools people already love with AI assistance and real-time collaboration built into the core workflow."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Reveal delay={(features.indexOf(feature) % 3) * 70} key={feature.title}>
                <Card className={cn("group ui-card-hover rounded-lg border bg-gradient-to-br shadow-sm transition duration-300", feature.tone)}>
                  <CardContent className="p-5">
                    <div className="grid size-11 place-items-center rounded-lg bg-white shadow-sm transition duration-300 group-hover:rotate-3 group-hover:scale-105">
                      <Icon aria-hidden="true" className="size-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { title: "Organize your workspace", description: "Bring notes, boards, calendar items, and whiteboards into one connected operating system.", icon: LayoutDashboard },
    { title: "Let AI help you plan and create", description: "Ask AI to draft tasks, refine notes, build templates, and reveal what deserves focus.", icon: BrainCircuit },
    { title: "Collaborate and track progress", description: "Share workspaces, comment on tasks, work live with teammates, and monitor execution.", icon: Users2 },
  ];
  return (
    <section className="border-y border-cyan-100/70 bg-white/70 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="How it works"
          title="From scattered ideas to coordinated execution"
          description="A simple three-step workflow that keeps planning, creating, and shipping inside the same premium workspace."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal delay={index * 90} className="rounded-lg border border-white bg-white/85 p-6 shadow-sm shadow-slate-200/60 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg" key={step.title}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">0{index + 1}</span>
                  <span className="grid size-11 place-items-center rounded-lg bg-cyan-50 text-cyan-600">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" id="showcase">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Product showcase"
          title="A workspace that feels complete from day one"
          description="Clean mockups of the core surfaces your users will rely on every day."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <ShowcaseCard title="Dashboard overview" icon={LayoutDashboard} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-4">
              {["Focus", "Tasks", "Notes", "AI insights"].map((item, index) => (
                <div className="rounded-lg border border-slate-100 bg-white p-4" key={item}>
                  <p className="text-xs font-medium text-slate-500">{item}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{[6, 24, 18, 9][index]}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="progress-grow h-full rounded-full bg-cyan-400" style={{ width: `${[64, 78, 52, 86][index]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ShowcaseCard>
          <ShowcaseCard title="Notes editor" icon={NotebookPen}>
            <div className="space-y-3 rounded-lg bg-white p-4">
              <div className="h-5 w-2/3 rounded bg-slate-900" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-5/6 rounded bg-slate-100" />
              <div className="rounded-lg border-l-4 border-cyan-300 bg-cyan-50 p-3 text-sm text-slate-600">AI suggested summary and next actions appear inline.</div>
            </div>
          </ShowcaseCard>
          <ShowcaseCard title="Kanban board" icon={ClipboardList}>
            <div className="grid grid-cols-3 gap-2">
              {["Ideas", "Doing", "Done"].map((item) => (
                <div className="rounded-lg bg-slate-50 p-3" key={item}>
                  <p className="mb-2 text-xs font-semibold text-slate-500">{item}</p>
                  <div className="space-y-2">
                    <div className="rounded-md bg-white p-2 shadow-sm"><div className="h-2 rounded bg-slate-200" /></div>
                    <div className="rounded-md bg-white p-2 shadow-sm"><div className="h-2 w-2/3 rounded bg-slate-200" /></div>
                  </div>
                </div>
              ))}
            </div>
          </ShowcaseCard>
          <ShowcaseCard title="Whiteboard" icon={Workflow}>
            <div className="relative h-56 overflow-hidden rounded-lg bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px]">
              <div className="absolute left-6 top-6 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">Research</div>
              <div className="absolute right-8 top-20 rounded-lg bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-700 shadow-sm">User journey</div>
              <div className="absolute bottom-8 left-28 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 shadow-sm">Launch map</div>
            </div>
          </ShowcaseCard>
          <ShowcaseCard title="AI Assistant" icon={Bot}>
            <div className="space-y-3 rounded-lg bg-slate-950 p-4 text-sm">
              <div className="rounded-lg bg-white/10 p-3 text-slate-200">Create a launch plan from today’s notes.</div>
              <div className="rounded-lg bg-white p-3 text-slate-700">Done. I created tasks, reminders, a board structure, and a summary for your team.</div>
            </div>
          </ShowcaseCard>
        </div>
      </div>
    </section>
  );
}

function ShowcaseCard({ title, icon: Icon, className, children }: { title: string; icon: typeof Sparkles; className?: string; children: React.ReactNode }) {
  return (
    <Reveal className={cn("ui-card ui-card-hover p-4", className)}>
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white">
          <Icon aria-hidden="true" className="size-4 text-cyan-300" />
        </span>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      </div>
      {children}
    </Reveal>
  );
}

function AIWorkflowSection() {
  return (
    <section className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8" id="ai">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-cyan-300">AI capabilities</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">AI that helps you convert intention into finished work</h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Flowbase gives AI the right workspace context so it can help with creation, planning, reminders, diagrams, and operational insights.
          </p>
          <Button asChild className="mt-8 rounded-lg bg-white text-slate-950 hover:bg-cyan-50">
            <Link href="/sign-up">
              Start with AI
              <ArrowRight aria-hidden="true" className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {aiFeatures.map((feature, index) => (
            <Reveal delay={(index % 2) * 80} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/[0.09]" key={feature}>
              <div className="mb-4 flex items-center justify-between">
                <Sparkles aria-hidden="true" className="size-5 text-amber-300" />
                <span className="text-xs font-semibold text-slate-500">AI 0{index + 1}</span>
              </div>
              <p className="font-medium text-white">{feature}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CollaborationSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mx-auto grid max-w-7xl gap-10 rounded-[1.25rem] border border-white bg-white/78 p-6 shadow-sm shadow-slate-200/70 md:p-10 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-cyan-700">Collaboration</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">A shared workspace for teams that move quickly</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Build team momentum with shared Kanban boards, active user presence, task comments, Liveblocks-powered collaboration, and a workspace experience that keeps everyone aligned.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Shared Kanban boards", "Active user presence", "Task comments", "Team workspaces"].map((item) => (
              <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700" key={item}>
                <Check aria-hidden="true" className="size-4 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950 p-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">Team presence</p>
            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">Live</span>
          </div>
          <div className="space-y-3">
            {["Maya is editing launch notes", "Daniel commented on Design QA", "Amara moved Homepage to Done"].map((item, index) => (
              <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] p-3 text-sm text-slate-200" key={item}>
                <span className={cn("grid size-8 place-items-center rounded-full text-xs font-bold text-white", ["bg-cyan-500", "bg-rose-500", "bg-amber-500"][index])}>
                  {["MC", "DR", "AS"][index]}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Use cases"
          title="Built for every kind of focused work"
          description="Flowbase adapts from solo planning to team operations without becoming noisy."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Reveal className="rounded-lg border border-white bg-white/82 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={useCase.title}>
                <Icon aria-hidden="true" className="size-5 text-cyan-600" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{useCase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{useCase.description}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" id="pricing">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Pricing"
          title="Simple plans for personal systems and team operations"
          description="Start free, then upgrade when your AI workspace becomes the center of how work gets done."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {pricing.map((plan) => (
            <Reveal className={cn("rounded-xl border bg-white/85 p-6 shadow-sm transition duration-300 hover:-translate-y-0.5", plan.featured ? "border-slate-950 shadow-xl shadow-slate-200" : "border-white")} key={plan.name}>
              {plan.featured && <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <h3 className="mt-5 text-xl font-semibold text-slate-950">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold text-slate-950">{plan.price}</span>
                <span className="pb-1 text-sm text-slate-500">/mo</span>
              </div>
              <Button asChild className={cn("pressable mt-6 w-full rounded-lg", plan.featured ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50")}>
                <Link href="/sign-up">{plan.cta}</Link>
              </Button>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div className="flex items-center gap-2 text-sm text-slate-700" key={feature}>
                    <Check aria-hidden="true" className="size-4 text-emerald-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="border-y border-cyan-100/70 bg-white/70 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow="Testimonials"
          title="Trusted by teams who want calmer execution"
          description="Placeholder customer stories for a polished enterprise-level marketing page."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Reveal className="rounded-lg border border-white bg-white/85 p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg" key={testimonial.name}>
              <p className="text-sm leading-7 text-slate-700">“{testimonial.quote}”</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white">{testimonial.name.split(" ").map((part) => part[0]).join("")}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{testimonial.name}</p>
                  <p className="text-xs text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" id="faq">
      <div className="mx-auto max-w-4xl">
        <SectionIntro
          eyebrow="FAQ"
          title="Questions before you start"
          description="Clear answers for the core parts of Flowbase: AI, notes, whiteboards, collaboration, templates, and privacy."
        />
        <div className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details className="group rounded-lg border border-white bg-white/85 p-5 shadow-sm transition duration-300 open:shadow-md" key={faq.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-950">
                {faq.question}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-6xl rounded-[1.25rem] bg-slate-950 px-6 py-14 text-center text-white shadow-2xl shadow-slate-300 sm:px-10">
        <p className="text-sm font-semibold uppercase text-cyan-300">Start today</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">Build your entire productivity system in one AI workspace</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">Create notes, tasks, reminders, boards, diagrams, and team workflows from one modern command center.</p>
        <Button asChild className="pressable mt-8 h-11 rounded-lg bg-white px-6 text-slate-950 hover:bg-cyan-50">
          <Link href="/sign-up">
            Start for Free
            <ArrowRight aria-hidden="true" className="ml-2 size-4" />
          </Link>
        </Button>
      </Reveal>
    </section>
  );
}

function Footer() {
  const groups = [
    { title: "Product", links: ["Features", "AI Assistant", "Collaboration", "Pricing"] },
    { title: "Resources", links: ["Templates", "Guides", "Changelog", "Support"] },
    { title: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
  ];
  return (
    <footer className="border-t border-cyan-100 bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white">
              <Sparkles aria-hidden="true" className="size-4 text-amber-300" />
            </span>
            <span className="font-semibold text-slate-950">Flowbase</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">A premium AI productivity workspace for notes, tasks, whiteboards, templates, calendars, and teams.</p>
          <div className="mt-5 flex gap-2 text-slate-500">
            {[Twitter, Linkedin, Github, Globe2].map((Icon, index) => (
              <a aria-label={`Social link ${index + 1}`} className="grid size-9 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 hover:text-slate-950" href="#" key={index}>
                <Icon aria-hidden="true" className="size-4" />
              </a>
            ))}
          </div>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-slate-950">{group.title}</h3>
            <div className="mt-4 space-y-3">
              {group.links.map((link) => (
                <a className="block text-sm text-slate-600 transition hover:text-slate-950" href="#" key={link}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-100 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Flowbase. All rights reserved.</span>
        <span className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-emerald-500" />
          Built for focused, secure collaboration.
        </span>
      </div>
    </footer>
  );
}
