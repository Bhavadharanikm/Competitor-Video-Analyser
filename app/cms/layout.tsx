"use client";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PinGate, { isCmsUnlocked } from "@/components/cms/PinGate";
import Sidebar from "@/components/cms/Sidebar";
import { ClientProvider } from "@/components/cms/ClientContext";

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUnlocked(isCmsUnlocked());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!unlocked) {
    return (
      <AnimatePresence>
        <PinGate
          onClose={() => router.push("/")}
          onSuccess={() => setUnlocked(true)}
        />
      </AnimatePresence>
    );
  }

  return (
    <ClientProvider>
      <div className="relative z-[1] min-h-screen flex" style={{ background: "#FFFFFF" }}>
        <Sidebar />
        <div className="flex-1 min-w-0 px-8 py-10">
          {children}
        </div>
      </div>
    </ClientProvider>
  );
}
