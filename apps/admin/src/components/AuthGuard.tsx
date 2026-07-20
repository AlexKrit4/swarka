"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AdminLayout } from "@/components/AdminLayout";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser() {
  return useContext(AdminUserContext);
}

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
    <AdminUserContext.Provider value={user}>
      <AdminLayout>{children}</AdminLayout>
    </AdminUserContext.Provider>
  );
}
