import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { AdminSubnav } from "@/components/admin/admin-subnav.component";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isSystemAdmin) redirect("/");
  return (
    <div>
      <AdminSubnav />
      {children}
    </div>
  );
}
