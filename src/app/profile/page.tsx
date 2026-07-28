import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { ProfileCard } from "@/components/profile-card";

export default async function ProfilePage() {
    const { data: user } = await getCurrentUser();
    
    if (!user) {
        redirect("/");
    }

    return (
        <div className="container mx-auto py-20 px-6">
            <h1 className="text-3xl font-bold mb-8">My Profile</h1>
            <div className="max-w-md mx-auto">
                <ProfileCard user={user} />
            </div>
            
        </div>
    );
}
