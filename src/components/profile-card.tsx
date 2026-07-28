"use client";

import { Card, CardBody, CardHeader, Avatar, Divider } from "@heroui/react";

interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    isSystemAdmin?: boolean;
    createdAt: Date;
}

interface ProfileCardProps {
    user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
    return (
        <Card>
            <CardHeader className="flex gap-4 p-6">
                <Avatar 
                    src={user.image || undefined} 
                    name={user.name} 
                    className="w-20 h-20 text-2xl"
                />
                <div>
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-gray-500">{user.email}</p>
                </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">User ID</label>
                        <p className="mt-1 font-mono text-sm">{user.id}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <p className="mt-1">{user.isSystemAdmin ? "System Admin" : "User"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Email Verified</label>
                        <p className="mt-1">{user.emailVerified ? "Yes" : "No"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Member Since</label>
                        <p className="mt-1">{new Date(user.createdAt).toDateString()}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
