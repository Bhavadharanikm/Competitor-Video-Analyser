function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>{title}</h1>
      </div>
      <div className="rounded-[16px] p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--muted)" }}>{description}</p>
      </div>
    </div>
  );
}

export default function ContentLibraryPage() {
  return (
    <ComingSoon
      title="Content Library"
      description="A reusable library of uploaded videos, images, and captions clients can be tagged with and pulled straight into a calendar entry, instead of pasting a fresh Drive link every time. Not built yet."
    />
  );
}
