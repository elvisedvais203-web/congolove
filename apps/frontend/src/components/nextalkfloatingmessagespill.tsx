"use client";

import Link from "next/link";

export function FloatingMessagesPill() {
  return (
    <div className="fixed bottom-6 right-5 z-40 hidden md:block">
      <Link
        href="/messages"
        className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0a1427f2] px-4 py-3 text-sm text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:bg-[#12203cf2]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16v10H8l-4 4V6Z" />
        </svg>
        <span className="font-semibold">Messages</span>
        <span className="ml-2 h-2 w-2 rounded-full bg-[#38d37f] shadow-[0_0_10px_rgba(56,211,127,0.7)]" />
      </Link>
    </div>
  );
}

