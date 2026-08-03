export function canEditRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Главный";
    case "ADMIN":
      return "Все права";
    case "VIEWER":
      return "Наблюдатель";
    default:
      return role;
  }
}

export const SUB_ADMIN_ROLE_OPTIONS = [
  { value: "ADMIN", label: "Все права" },
  { value: "VIEWER", label: "Наблюдатель" },
] as const;

export type SubAdminRole = (typeof SUB_ADMIN_ROLE_OPTIONS)[number]["value"];
