"use client";
import { useRouter } from "next/navigation";
import ContentCalendar from "@/components/cms/ContentCalendar";
import { useCmsClient } from "@/components/cms/ClientContext";

export default function CalendarPage() {
  const router = useRouter();
  const { selectedClient } = useCmsClient();

  const platforms = [
    selectedClient?.instagram_account_id ? "Instagram" : null,
    selectedClient ? "Facebook" : null,
  ].filter(Boolean).join(" & ");

  return (
    <div className="max-w-[1760px]">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
          <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Content calendar</h1>
          {selectedClient && (
            <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
              Planning for <span className="font-semibold" style={{ color: "var(--text)" }}>{selectedClient.name}</span>{platforms ? ` · ${platforms}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push("/cms/calendar?new=1")}
          className="px-5 py-2.5 rounded-[10px] text-[14px] font-bold cursor-pointer"
          style={{ background: "#2563EB", color: "#fff", border: "none" }}
        >+ New post</button>
      </div>

      <ContentCalendar />
    </div>
  );
}
