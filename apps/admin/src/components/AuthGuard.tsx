"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AdminLayout } from "@/components/AdminLayout";
import {
  AdminUserProvider,
  type AdminUser,
} from "@/components/AdminUserContext";

export type { AdminUser } from "@/components/AdminUserContext";
export { useAdminUser, useCanEdit } from "@/components/AdminUserContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((res) => {
        setUser(res.user as AdminUser);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Загрузка...
      </div>
    );
  }

  return (
    <AdminUserProvider user={user}>
      <AdminLayout>{children}</AdminLayout>
    </AdminUserProvider>
  );
}
