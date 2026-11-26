import Link from "next/link";
import type { DashboardCardItem } from "./cards";

export function DashboardCard({ card }: { card: DashboardCardItem }) {
  return (
    <Link
      href={card.href}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c99a3b] hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-[#b28a45]">{card.icon}</span>
        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#6b1720]">
          ↗
        </span>
      </div>
      <h3 className="mt-5 font-semibold text-slate-900">{card.title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
    </Link>
  );
}
