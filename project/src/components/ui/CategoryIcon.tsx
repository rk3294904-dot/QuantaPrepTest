import { BarChart3, BookOpen, BrainCircuit, Calculator, Layers, Target, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons: Record<string, LucideIcon> = {
  calculator: Calculator,
  brain: BrainCircuit,
  book: BookOpen,
  chart: BarChart3,
  layers: Layers,
  target: Target,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? BookOpen;
  return <Icon className={cn('h-5 w-5', className)} aria-hidden />;
}

export const CATEGORY_ICON_OPTIONS = Object.keys(icons);
