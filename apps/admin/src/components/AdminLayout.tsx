"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden md:flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto min-w-0">{children}</main>
      </div>

      <div className="md:hidden min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white"
            aria-label="Открыть меню"
          >
            <span className="block w-5 h-0.5 bg-gray-900 rounded-full" />
            <span className="block w-5 h-0.5 bg-gray-900 rounded-full" />
            <span className="block w-5 h-0.5 bg-gray-900 rounded-full" />
          </button>
          <div>
            <p className="font-black italic leading-none">SWARKA</p>
            <p className="text-[11px] text-gray-500">Админ-панель</p>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto min-w-0 w-full">{children}</main>
      </div>

      {menuOpen && <Sidebar mobile onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
