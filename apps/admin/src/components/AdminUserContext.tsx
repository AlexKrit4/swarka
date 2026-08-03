"use client";

import { createContext, useContext } from "react";
import { canEditRole } from "@/lib/permissions";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const AdminUserContext = createContext<AdminUser | null>(null);

export function AdminUserProvider({
  user,
  children,
}: {
  user: AdminUser;
  children: React.ReactNode;
}) {
  return (
    <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>
  );
}

export function useAdminUser() {
  return useContext(AdminUserContext);
}

export function useCanEdit() {
  const user = useAdminUser();
  return canEditRole(user?.role);
}
