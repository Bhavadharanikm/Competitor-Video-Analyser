"use client";
import { useEffect, useState } from "react";

interface Summary {
  scheduled: number;
  needsApproval: number;
  published: number;
}

const CARDS: { key: keyof Summary; label: string; sub: string; icon: string; iconBg: string; iconColor: string }[] = [
  { key: "scheduled", label: "Scheduled", sub: "Next 7 days", icon: "clock", iconBg: "rgba(37,99,235,0.12)", iconColor: "#2563EB" },
  { key: "needsApproval", label: "Needs Approval", sub: "Awaiting client sign-off", icon: "warn", iconBg: "rgba(217,119,6,0.12)", iconColor: "#D97706" },
  { key: "published", label: "Published", sub: "Last 7 days", icon: "check", iconBg: "rgba(22,163,74,0.12)", iconColor: "#16A34A" },
];

function CardIcon({ name, color }: { name: string; color: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
  if (name === "warn") return <svg {...common}><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4M12 17h.01" /></svg>;
  return <svg {...common}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
}

export default function StatCards() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/cms/analytics/summary")
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {CARDS.map(c => (
        <div key={c.key} className="rounded-[16px] p-5 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>{c.label}</p>
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: c.iconBg }}>
              <CardIcon name={c.icon} color={c.iconColor} />
            </div>
          </div>
          <p className="text-[32px] font-bold leading-none" style={{ color: "var(--text)" }}>
            {summary ? summary[c.key] : "—"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
