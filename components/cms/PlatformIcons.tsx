"use client";
import { useState } from "react";

let igGradCounter = 0;

export function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0" style={{ filter: "drop-shadow(0 0 0.5px rgba(0,0,0,0.15))" }}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path d="M15.5 8.5h-1.7c-.4 0-.8.4-.8.9V11h2.4l-.3 2.4h-2.1V19h-2.4v-5.6H8.7V11h1.9V9.1c0-1.9 1.1-3 3-3h2v2.4Z" fill="#fff" />
    </svg>
  );
}

export function InstagramIcon({ size = 16 }: { size?: number }) {
  const [gid] = useState(() => `ig-grad-${igGradCounter++}`);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0" style={{ filter: "drop-shadow(0 0 0.5px rgba(0,0,0,0.15))" }}>
      <defs>
        <radialGradient id={gid} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="20%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="65%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <circle cx="12" cy="12" r="10.5" fill={`url(#${gid})`} />
      <rect x="7.6" y="7.6" width="8.8" height="8.8" rx="2.6" fill="none" stroke="#fff" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="#fff" strokeWidth="1.3" />
      <circle cx="14.9" cy="9.1" r="0.6" fill="#fff" />
    </svg>
  );
}

export function PlatformIcons({ platform, size = 16 }: { platform: string; size?: number }) {
  return (
    <span className="flex items-center -space-x-1.5 flex-shrink-0">
      {(platform === "both" || platform === "facebook") && <FacebookIcon size={size} />}
      {(platform === "both" || platform === "instagram") && <InstagramIcon size={size} />}
    </span>
  );
}
