"use client";

import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

type SessionUser = {
    email: string;
    emailVerified: boolean;
} | null;

export function EmailVerificationProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const session = await authClient.getSession();
                if (session?.data?.user) {
                    setUser({
                        email: session.data.user.email,
                        emailVerified: session.data.user.emailVerified,
                    });
                } else {
                    setUser(null);
                }
            } catch {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();
    }, []);

    // Don't show anything while loading or if no user
    if (isLoading || !user) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            <EmailVerificationBanner 
                userEmail={user.email} 
                emailVerified={user.emailVerified} 
            />
        </>
    );
}
