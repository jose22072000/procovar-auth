import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function DashboardPage() {
    const { data: user } = await getCurrentUser();
    
    if (!user) {
        redirect("/");
    }

    if (!user.isSystemAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-4xl font-bold text-danger mb-4">Access Denied</h1>
                <p className="text-gray-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
            <AdminDashboard />
        </div>
    );
}
