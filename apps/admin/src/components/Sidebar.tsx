"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/api";
import { useAdminUser } from "@/components/AdminUserContext";
import { getRoleLabel } from "@/lib/permissions";
import { isMobileApp, reportMobileMenuOpen, switchAccount } from "@/lib/mobile-bridge";
import { useEffect } from "react";

const NAV = [
  { href: "/", label: "Дашборд" },
  { href: "/analytics", label: "Статистика" },
  { href: "/services", label: "Услуги" },
  { href: "/portfolio", label: "Наши работы" },
  { href: "/content", label: "Контент сайта" },
  { href: "/why-us", label: "Преимущества" },
  { href: "/versions", label: "Версии и логи" },
  { href: "/settings", label: "Настройки" },
  { href: "/billing", label: "Оплата" },
  { href: "/faq", label: "FAQ" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/leads", label: "Заявки" },
];

const SUPPORT_NAV = { href: "/support", label: "Поддержка" };

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

function AccountBadge({
  email,
  name,
  role,
  compact = false,
}: {
  email?: string | null;
  name?: string | null;
  role?: string | null;
  compact?: boolean;
}) {
  if (!email && !name) return null;

  const title = name?.trim() || email || "Аккаунт";
  const subtitle = name?.trim() && email ? email : null;

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 mb-4"
          : "mb-8"
      }
    >
      {!compact && <p className="text-lg font-black italic">SWARKA</p>}
      <p className={`${compact ? "text-sm" : "text-xs"} text-gray-300 font-medium truncate`}>
        {title}
      </p>
      {subtitle && (
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{subtitle}</p>
      )}
      {role && (
        <p className={`${compact ? "text-[11px] mt-1" : "text-xs"} text-gray-400`}>
          {getRoleLabel(role)}
        </p>
      )}
    </div>
  );
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAdminUser();
  const isSuper = user?.role === "SUPER_ADMIN";
  const mobileApp = isMobileApp();

  useEffect(() => {
    if (!mobile) return;
    reportMobileMenuOpen(true);
    return () => reportMobileMenuOpen(false);
  }, [mobile]);

  const handleLogout = async () => {
    await logout();
    const { clearToken } = await import("@/lib/auth");
    clearToken();
    const bridge = (window as unknown as { SwarkaAdmin?: { onLogout?: () => void } }).SwarkaAdmin;
    if (bridge?.onLogout) {
      bridge.onLogout();
      return;
    }
    window.location.href = "/login";
  };

  const handleSwitchAccount = () => {
    if (mobile) onClose?.();
    switchAccount();
  };

  const items = (() => {
    const list = [...NAV];
    if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
      list.push(SUPPORT_NAV);
    }
    if (isSuper) {
      list.push({ href: "/admins", label: "Админы" });
    }
    return list;
  })();

  const handleNavClick = () => {
    if (mobile) onClose?.();
  };

  return (
    <aside
      className={
        mobile
          ? "fixed inset-0 z-50 bg-gray-900 text-white flex flex-col p-4 overflow-hidden"
          : "w-56 bg-gray-900 text-white min-h-screen max-h-screen p-4 flex flex-col shrink-0 overflow-hidden sticky top-0"
      }
    >
      <div className="shrink-0">
        {mobile && (
          <div className="flex items-center gap-3 mb-4">
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
          <AccountBadge email={user?.email} name={user?.name} role={user?.role} />
        )}

        {mobile && (
          <AccountBadge email={user?.email} name={user?.name} role={user?.role} compact />
        )}
      </div>

      <nav
        className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={`px-3 py-3 rounded-lg text-base transition-colors shrink-0 ${
              pathname === item.href
                ? "bg-[#F7E018] text-black font-semibold"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="shrink-0 pt-3 mt-2 border-t border-white/10">
        {mobileApp && (
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="w-full text-sm text-gray-400 hover:text-white text-left px-3 py-3"
          >
            Сменить аккаунт
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-sm text-gray-400 hover:text-white text-left px-3 py-3"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
