"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { useAdminUser } from "./AuthGuard";

const NAV = [
  { href: "/", label: "Дашборд" },
  { href: "/services", label: "Услуги" },
  { href: "/portfolio", label: "Наши работы" },
  { href: "/settings", label: "Настройки" },
  { href: "/faq", label: "FAQ" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/leads", label: "Заявки" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAdminUser();
  const isSuper = user?.role === "SUPER_ADMIN";

  const handleLogout = async () => {
    await logout();
    const { clearToken } = await import("@/lib/auth");
    clearToken();
    window.location.href = "/login";
  };

  const items = isSuper
    ? [...NAV, { href: "/admins", label: "Админы" }]
    : NAV;

  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen p-4 flex flex-col shrink-0">
      <div className="mb-8">
        <p className="text-lg font-black italic">SWARKA</p>
        <p className="text-xs text-gray-400">
          {isSuper ? "Главный админ" : "Админ-панель"}
        </p>
        {user?.email && (
          <p className="text-[11px] text-gray-500 mt-1 truncate">{user.email}</p>
        )}
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? "bg-[#F7E018] text-black font-semibold"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 text-sm text-gray-400 hover:text-white text-left px-3 py-2"
      >
        Выйти
      </button>
    </aside>
  );
}
