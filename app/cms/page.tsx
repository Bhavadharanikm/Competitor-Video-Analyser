"use client";
import { useRouter } from "next/navigation";
import StatCards from "@/components/cms/StatCards";

const SHORTCUTS = [
  { href: "/cms/calendar", label: "Open Content Calendar", desc: "Schedule and publish reels & posts" },
  { href: "/cms/clients", label: "View Clients", desc: "Connected Facebook & Instagram accounts" },
  { href: "/cms/analytics", label: "View Analytics", desc: "Scheduled, approvals, published" },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
      </div>

      <StatCards />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {SHORTCUTS.map(s => (
          <button
            key={s.href}
            onClick={() => router.push(s.href)}
            className="text-left rounded-[16px] p-5 cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-[14px] font-bold mb-1" style={{ color: "var(--text)" }}>{s.label}</p>
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
