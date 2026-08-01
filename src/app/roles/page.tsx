import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { RolesManager } from "@/components/roles-manager";

export default async function RolesPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    if (!user.isSystemAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-4xl font-bold text-danger mb-4">Access Denied</h1>
                <p className="text-gray-500">Solo el super-admin puede gestionar roles.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Roles y permisos</h1>
            <p className="text-default-500 mb-6">
                Define roles una sola vez y asígnalos a los usuarios. Un usuario puede tener varios
                roles; sus permisos son la suma de todos.
            </p>
            <RolesManager />
        </div>
    );
}
