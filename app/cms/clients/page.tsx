"use client";
import { useEffect, useState } from "react";

interface Client {
  page_id: string;
  name: string;
  instagram_account_id: string | null;
}

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: connected ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
        color: connected ? "#16A34A" : "#D97706",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? "#16A34A" : "#D97706" }} />
      {label}
    </span>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchClients = () => {
    setLoading(true);
    fetch("/api/cms/clients")
      .then(r => r.json())
      .then(data => setClients((data.clients ?? []).sort((a: Client, b: Client) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const syncClients = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/cms/clients/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.text()) || "Sync failed");
      fetchClients();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-[1760px]">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
          <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Clients</h1>
        </div>
        <div className="flex items-center gap-3">
          {syncError && <span className="text-[12px]" style={{ color: "#EF4444" }}>{syncError}</span>}
          <button
            onClick={syncClients}
            disabled={syncing}
            className="px-4 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >{syncing ? "Syncing…" : "↻ Sync from Meta"}</button>
        </div>
      </div>

      {loading && <p className="text-[13px]" style={{ color: "var(--muted)" }}>Loading clients…</p>}

      {!loading && clients.length === 0 && (
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>No clients synced yet — click &ldquo;Sync from Meta&rdquo; to pull Pages from your Meta Business account.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(c => (
          <div key={c.page_id} className="rounded-[16px] p-5 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{c.name}</p>
            <div className="flex flex-wrap gap-2">
              <StatusPill connected label="Facebook" />
              <StatusPill connected={!!c.instagram_account_id} label={c.instagram_account_id ? "Instagram" : "Instagram not connected"} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[12px] mt-8" style={{ color: "var(--muted)" }}>
        TikTok isn&rsquo;t connected for any client yet — this CMS only integrates with Meta (Facebook Pages &amp; Instagram) right now.
      </p>
    </div>
  );
}
