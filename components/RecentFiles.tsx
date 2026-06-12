"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "./TabSwitcher";

export interface VideoFile {
  name:   string;
  type:   Tab;
  size:   string;
  when:   string;
  source: "drive" | "upload";
}

type Filter = "all" | Tab;

interface Props {
  files:    VideoFile[];
  activeTab: Tab;
  onRerun:  (file: VideoFile) => void;
}

export default function RecentFiles({ files, activeTab, onRerun }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "all" ? files : files.filter((f) => f.type === filter);
  const activeColor = activeTab === "competitor" ? "#6366F1" : "#00D4A0";
  const activeGlow  = activeTab === "competitor" ? "rgba(99,102,241,0.25)" : "rgba(0,212,160,0.22)";

  const filterStyle = (id: Filter) =>
    filter === id
      ? { borderColor: activeColor, color: activeColor, background: activeGlow }
      : { borderColor: "var(--border)", color: "var(--muted)", background: "none" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.75 }}
      className="rounded-3xl overflow-hidden mb-10"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 text-[13px] font-semibold">
          Recent
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            {visible.length} file{visible.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-1">
          {(["all", "competitor", "client"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={filterStyle(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
            {["File", "Source", "Type", "Size", "When", ""].map((h) => (
              <th key={h} className="px-7 py-2.5 text-left" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "JetBrains Mono, monospace" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {visible.map((file, i) => (
              <motion.tr
                key={file.name + file.when}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="group cursor-pointer transition-colors duration-150"
                style={{ borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-7 py-4" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                  {file.name}
                </td>
                <td className="px-7 py-4">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md"
                    style={{
                      border: `1px solid ${file.source === "drive" ? "rgba(99,102,241,0.3)" : "rgba(0,212,160,0.25)"}`,
                      color: file.source === "drive" ? "#6366F1" : "#00D4A0",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                    {file.source === "drive" ? "Drive link" : "Upload"}
                  </span>
                </td>
                <td className="px-7 py-4">
                  <span
                    className="text-[10px] font-medium px-2 py-1 rounded-md"
                    style={{
                      border: `1px solid ${file.type === "competitor" ? "rgba(99,102,241,0.3)" : "rgba(0,212,160,0.25)"}`,
                      color: file.type === "competitor" ? "#6366F1" : "#00D4A0",
                    }}
                  >
                    {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
                  </span>
                </td>
                <td className="px-7 py-4" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)" }}>
                  {file.size}
                </td>
                <td className="px-7 py-4" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {file.when}
                </td>
                <td className="px-7 py-4 text-right">
                  <button
                    onClick={() => onRerun(file)}
                    className="opacity-0 group-hover:opacity-100 text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
                    onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = activeColor; b.style.color = activeColor; }}
                    onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; }}
                  >
                    Re-analyse →
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>

          {visible.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center" style={{ fontSize: 13, color: "var(--muted)" }}>
                No files yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
}
