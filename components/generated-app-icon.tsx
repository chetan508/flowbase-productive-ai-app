import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Flame,
  GraduationCap,
  HeartPulse,
  LineChart,
  ListChecks,
  NotebookPen,
  PiggyBank,
  Sparkles,
  Target,
  Utensils,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export const generatedAppIcons: Record<string, LucideIcon> = {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Flame,
  GraduationCap,
  HeartPulse,
  LineChart,
  ListChecks,
  NotebookPen,
  PiggyBank,
  Sparkles,
  Target,
  Utensils,
  WalletCards,
};

export function GeneratedAppIcon({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  const Icon = generatedAppIcons[name] ?? Sparkles;
  return <Icon aria-hidden="true" className={className} />;
}
