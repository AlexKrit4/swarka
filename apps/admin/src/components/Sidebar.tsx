"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { useAdminUser } from "./AuthGuard";

const NAV = [
  { href: "/", label: "Дашборд" },
  { href: "/services", label: "Услуги" },
  { href: "/portfolio", label: "Наши работы" },
  { href: "/content", label: "Контент сайта" },
  { href: "/why-us", label: "Преимущества" },
  { href: "/settings", label: "Настройки" },
  { href: "/faq", label: "FAQ" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/leads", label: "Заявки" },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
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

  const handleNavClick = () => {
    if (mobile) onClose?.();
  };

  return (
    <aside
      className={
        mobile
          ? "fixed inset-0 z-50 bg-gray-900 text-white flex flex-col p-4"
          : "w-56 bg-gray-900 text-white min-h-screen p-4 flex flex-col shrink-0"
      }
    >
      {mobile && (
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/15 text-xl"
            aria-label="Закрыть меню"
          >
            ←
          </button>
          <div>
            <p className="text-lg font-black italic">SWARKA</p>
            <p className="text-xs text-gray-400">Меню</p>
          </div>
        </div>
      )}

      {!mobile && (
        <div className="mb-8">
          <p className="text-lg font-black italic">SWARKA</p>
          <p className="text-xs text-gray-400">
            {isSuper ? "Главный админ" : "Админ-панель"}
          </p>
          {user?.email && (
            <p className="text-[11px] text-gray-500 mt-1 truncate">{user.email}</p>
          )}
        </div>
      )}

      {mobile && user?.email && (
        <p className="text-[11px] text-gray-500 mb-4 truncate">{user.email}</p>
      )}

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={`px-3 py-3 rounded-lg text-base transition-colors ${
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
        className="mt-4 text-sm text-gray-400 hover:text-white text-left px-3 py-3"
      >
        Выйти
      </button>
    </aside>
  );
}
