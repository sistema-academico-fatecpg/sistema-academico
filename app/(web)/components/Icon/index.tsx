"use client";

import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import styles from "./styles.module.scss";

/**
 * Adaptador de ícones: as páginas usam nomes semânticos e não importam a
 * biblioteca diretamente. Novos ícones devem ser adicionados a este mapa.
 */
const icons = {
  activity: Activity,
  alert: TriangleAlert,
  back: ArrowLeft,
  book: BookOpen,
  calendar: CalendarDays,
  check: Check,
  chevron: ChevronDown,
  close: X,
  dashboard: LayoutDashboard,
  down: ArrowDown,
  download: Download,
  edit: Pencil,
  filter: SlidersHorizontal,
  grades: ClipboardList,
  help: CircleHelp,
  home: Home,
  logout: LogOut,
  menu: Menu,
  next: ArrowRight,
  notifications: Bell,
  report: FileText,
  academic: GraduationCap,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  security: ShieldCheck,
  subjects: BookOpen,
  add: Plus,
  delete: Trash2,
  user: UserRound,
  users: Users,
  view: Eye,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className }: IconProps) {
  const Component = icons[name as IconName] ?? CircleHelp;
  return (
    <Component
      aria-hidden="true"
      className={[styles.icon, styles[size], className].filter(Boolean).join(" ")}
    />
  );
}
