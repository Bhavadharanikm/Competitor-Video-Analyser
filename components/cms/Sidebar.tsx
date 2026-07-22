"use client";
import { usePathname, useRouter } from "next/navigation";

const ACTIVE_COLOR = "#2563EB";
const ACTIVE_BG = "rgba(37,99,235,0.1)";

const NAV_ITEMS = [
  { href: "/cms", label: "Dashboard", icon: "home" },
  { href: "/cms/calendar", label: "Content Calendar", icon: "calendar" },
  { href: "/cms/analytics", label: "Analytics", icon: "bars" },
  { href: "/cms/listening", label: "Listening", icon: "chat" },
  { href: "/cms/clients", label: "Clients", icon: "people" },
];

const WORKSPACE_ITEMS = [
  { href: "/cms/content-library", label: "Content library", icon: "pencil" },
  { href: "/cms/approvals", label: "Approvals", icon: "clock" },
  { href: "/cms/settings", label: "Settings", icon: "gear" },
];

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? ACTIVE_COLOR : "var(--muted)";
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9h12v-9" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M8 3.5v3M16 3.5v3" /></svg>;
    case "bars":
      return <svg {...common}><path d="M5 20V11M12 20V4M19 20v-7" /></svg>;
    case "chat":
      return <svg {...common}><path d="M4 5.5h16v10H9l-4 4v-4H4Z" /></svg>;
    case "people":
      return <svg {...common}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.6-3 2.7-5 5.5-5s4.9 2 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15 14.2c2.1.5 3.6 2.1 4 4.8" /></svg>;
    case "pencil":
      return <svg {...common}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-4-4L4 16v4Z" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case "gear":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M4.4 7.5l2.2 1.2M17.4 15.3l2.2 1.2M4.4 16.5l2.2-1.2M17.4 8.7l2.2-1.2M3 12h2.5M18.5 12H21" /></svg>;
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => href === "/cms" ? pathname === "/cms" : pathname.startsWith(href);

  const Item = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
    const active = isActive(href);
    return (
      <button
        onClick={() => router.push(href)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-semibold cursor-pointer w-full text-left"
        style={{ background: active ? ACTIVE_BG : "transparent", color: active ? ACTIVE_COLOR : "var(--text)" }}
      >
        <NavIcon name={icon} active={active} />
        {label}
      </button>
    );
  };

  return (
    <div className="w-[248px] flex-shrink-0 min-h-screen flex flex-col justify-between px-4 py-6" style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => <Item key={item.href} {...item} />)}

        <p className="text-[11px] font-semibold tracking-widest uppercase mt-6 mb-1 px-3" style={{ color: "var(--muted)" }}>Workspace</p>
        {WORKSPACE_ITEMS.map(item => <Item key={item.href} {...item} />)}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => router.push("/")}
          className="px-3 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer text-left"
          style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
        >
          ← Back to Video Analyser
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR, color: "#fff" }}>P</div>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Pooja</span>
        </div>
      </div>
    </div>
  );
}
