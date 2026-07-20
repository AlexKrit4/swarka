import { Sidebar } from "@/components/Sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}
