"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCmsClient } from "./ClientContext";
import { FacebookIcon, InstagramIcon } from "./PlatformIcons";

const ACTIVE_COLOR = "#2563EB";
const ACTIVE_BG = "rgba(37,99,235,0.1)";

const NAV_ITEMS = [
  { href: "/cms", label: "Dashboard", icon: "home" },
  { href: "/cms/calendar", label: "Calendar", icon: "calendar" },
  { href: "/cms/compose", label: "Compose", icon: "pencil" },
  { href: "/cms/queue", label: "Publishing queue", icon: "clock" },
  { href: "/cms/approvals", label: "Approvals", icon: "check", badgeKey: "approvals" as const },
  { href: "/cms/analytics", label: "Analytics", icon: "bars" },
  { href: "/cms/content-library", label: "Asset library", icon: "image" },
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
    case "image":
      return <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="M3 16.5l5-4.5 3.5 3 4-4 5.5 5.5" /></svg>;
    case "pencil":
      return <svg {...common}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-4-4L4 16v4Z" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case "check":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.3 2.3L15.5 10" /></svg>;
    case "gear":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M4.4 7.5l2.2 1.2M17.4 15.3l2.2 1.2M4.4 16.5l2.2-1.2M17.4 8.7l2.2-1.2M3 12h2.5M18.5 12H21" /></svg>;
    default:
      return null;
  }
}

function ClientSwitcher() {
  const { sortedClients, selectedClientPageId, selectedClient, setSelectedClientPageId, clientsLoading, syncing, syncClients } = useCmsClient();
  const [open, setOpen] = useState(false);

  const initials = (selectedClient?.name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[12px] cursor-pointer text-left"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR, color: "#fff" }}>
          {clientsLoading ? "…" : initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>
            {clientsLoading ? "Loading…" : selectedClient?.name ?? "No client"}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>
            {sortedClients.length} client{sortedClients.length !== 1 ? "s" : ""} synced
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M7 10l5 5 5-5" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-[12px] py-1.5 max-h-[320px] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            {sortedClients.map(c => (
              <button
                key={c.page_id}
                onClick={() => { setSelectedClientPageId(c.page_id); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-semibold cursor-pointer text-left"
                style={{ color: c.page_id === selectedClientPageId ? ACTIVE_COLOR : "var(--text)", background: c.page_id === selectedClientPageId ? ACTIVE_BG : "transparent" }}
              >
                <span className="truncate">{c.name}</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <FacebookIcon size={13} />
                  {c.instagram_account_id && <InstagramIcon size={13} />}
                </span>
              </button>
            ))}
            {sortedClients.length === 0 && !clientsLoading && (
              <p className="px-3 py-2 text-[12px]" style={{ color: "var(--muted)" }}>No clients synced yet</p>
            )}
            <div className="mt-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => { syncClients(); setOpen(false); }}
                disabled={syncing}
                className="w-full text-left px-3 py-2 text-[12px] font-semibold cursor-pointer disabled:opacity-50"
                style={{ color: "var(--muted)" }}
              >{syncing ? "Syncing…" : "↻ Sync from Meta"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [approvalsCount, setApprovalsCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cms/calendar?status=in_review")
      .then(r => r.json())
      .then(data => setApprovalsCount((data.entries ?? []).length))
      .catch(() => {});
  }, []);

  const Item = ({ href, label, icon, badgeKey }: { href: string; label: string; icon: string; badgeKey?: "approvals" }) => {
    const active = pathname === href.split("?")[0] && !href.includes("?");
    const badge = badgeKey === "approvals" ? approvalsCount : null;
    return (
      <button
        onClick={() => router.push(href)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-semibold cursor-pointer w-full text-left"
        style={{ background: active ? ACTIVE_BG : "transparent", color: active ? ACTIVE_COLOR : "var(--text)" }}
      >
        <NavIcon name={icon} active={active} />
        <span className="flex-1">{label}</span>
        {!!badge && (
          <span className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#D97706", color: "#fff" }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-[260px] flex-shrink-0 min-h-screen flex flex-col justify-between px-4 py-6" style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
      <div className="flex flex-col">
        <div className="flex items-center gap-2 px-1 mb-5">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: ACTIVE_COLOR, transform: "rotate(45deg)" }}>
            <div style={{ transform: "rotate(-45deg)" }} className="w-2.5 h-2.5 rounded-[2px]" />
          </div>
          <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>HiddenGem</span>
          <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[5px]" style={{ background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}>Social</span>
        </div>

        <ClientSwitcher />

        <button
          onClick={() => router.push("/cms/compose")}
          className="w-full mb-5 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer"
          style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
        >+ New post</button>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => <Item key={item.href} {...item} />)}
        </div>
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
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>Pooja</p>
            <p className="text-[11px] truncate" style={{ color: "var(--muted)" }}>Account lead</p>
          </div>
          <button onClick={() => router.push("/cms/settings")} className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "none", border: "none" }}>
            <NavIcon name="gear" active={pathname === "/cms/settings"} />
          </button>
        </div>
      </div>
    </div>
  );
}
