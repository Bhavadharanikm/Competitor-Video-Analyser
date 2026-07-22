function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Content Management System</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>{title}</h1>
      </div>
      <div className="rounded-[16px] p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>{description}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="CMS-wide settings — PIN, notification preferences, and team access — will live here."
    />
  );
}
