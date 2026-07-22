"use client";
import ContentCalendar from "@/components/cms/ContentCalendar";

export default function CalendarPage() {
  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Content Calendar</h1>
      </div>

      <ContentCalendar />
    </div>
  );
}
