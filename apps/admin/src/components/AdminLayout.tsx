"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAdminUser, useCanEdit } from "@/components/AdminUserContext";
import { getRoleLabel } from "@/lib/permissions";
import { reportMobilePageScroll } from "@/lib/mobile-bridge";
import { BillingBanner } from "@/components/BillingBanner";
import { BillingTopUpBanner } from "@/components/BillingTopUpBanner";

function ReadOnlyBanner() {
  const user = useAdminUser();
  if (!user || user.role !== "VIEWER") return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Режим наблюдателя — вы можете просматривать все разделы, но не можете вносить изменения.
    </div>
  );
}

function MainContent({ children }: { children: React.ReactNode }) {
  const canEdit = useCanEdit();

  return (
    <>
      <BillingTopUpBanner />
      <BillingBanner />
      <ReadOnlyBanner />
      <fieldset disabled={!canEdit} className="contents min-w-0">
        {children}
      </fieldset>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAdminUser();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const reportScroll = () => {
      reportMobilePageScroll(main.scrollTop);
    };

    main.addEventListener("scroll", reportScroll, { passive: true });
    reportScroll();

    return () => {
      main.removeEventListener("scroll", reportScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
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
          <p className="text-[11px] text-gray-500">
            {user ? getRoleLabel(user.role) : "Админ-панель"}
          </p>
        </div>
      </div>

      <main
        ref={mainRef}
        className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto min-w-0 w-full min-h-0"
      >
        <MainContent>{children}</MainContent>
      </main>

      {menuOpen && <Sidebar mobile onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
