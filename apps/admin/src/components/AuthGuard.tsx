"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AdminLayout } from "@/components/AdminLayout";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    getMe()
      .then(() => setReady(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Загрузка...
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
