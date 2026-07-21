"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CMS_UNLOCK_KEY = "cms_unlocked";

export function isCmsUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CMS_UNLOCK_KEY) === "true";
}

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinGate({ onSuccess, onClose }: Props) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const submit = async (code: string) => {
    setChecking(true);
    setError(false);
    try {
      const res = await fetch("/api/cms/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(CMS_UNLOCK_KEY, "true");
        onSuccess();
      } else {
        setError(true);
        setDigits(["", "", "", ""]);
        inputsRef.current[0]?.focus();
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (i: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError(false);
    if (v && i < 3) inputsRef.current[i + 1]?.focus();
    if (next.every(d => d !== "")) submit(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="text-[16px] font-bold text-center" style={{ color: "var(--text)" }}>Content Management System</p>
          <p className="text-[12px] mt-1 text-center" style={{ color: "var(--muted)" }}>Enter your 4-digit code to continue</p>
        </div>

        <div className="flex gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputsRef.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={checking}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-12 h-14 rounded-[10px] text-center text-[20px] font-bold outline-none"
              style={{
                background: "var(--bg)",
                border: `1.5px solid ${error ? "#EF4444" : "var(--border)"}`,
                color: "var(--text)",
              }}
            />
          ))}
        </div>

        {error && <p className="text-[12px]" style={{ color: "#EF4444" }}>Incorrect code — try again.</p>}

        <button
          onClick={onClose}
          className="text-[12px] font-semibold cursor-pointer"
          style={{ color: "var(--muted)", background: "none", border: "none" }}
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
