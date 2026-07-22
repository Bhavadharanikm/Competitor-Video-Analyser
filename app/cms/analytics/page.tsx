import StatCards from "@/components/cms/StatCards";

export default function AnalyticsPage() {
  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Analytics</h1>
      </div>

      <StatCards />

      <p className="text-[13px] mt-8" style={{ color: "var(--muted)" }}>
        Counts are agency-wide, across every synced client. More breakdowns (per-client, per-platform, engagement) land here as that data becomes available.
      </p>
    </div>
  );
}
