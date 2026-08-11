"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

// Types
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    createdAt: string;
}

export interface Member {
    id: string;
    role: string;
    organizationId: string;
    createdAt: string;
    organization: Organization;
}

export interface Account {
    id: string;
    providerId: string;
}

export interface FullUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    isSystemAdmin: boolean;
    phone?: string | null;
    createdAt: string;
    updatedAt: string;
    members: Member[];
    accounts: Account[];
}

export interface FullUserContextType {
    user: FullUser | null;
    isLoading: boolean;
    error: string | null;
    // Organization helpers
    organizations: Member[];
    // Methods
    refreshUser: () => Promise<void>;
    setActiveOrganization: (organizationId: string | null) => Promise<void>;
    // Permission helpers
    hasRole: (role: string, organizationId?: string) => boolean;
    isOwner: (organizationId?: string) => boolean;
    isAdmin: (organizationId?: string) => boolean;
    isMemberOf: (organizationId: string) => boolean;
    // Provider helpers
    hasProvider: (providerId: string) => boolean;
    linkedProviders: string[];
}

const FullUserContext = createContext<FullUserContextType | null>(null);

interface FullUserProviderProps {
    children: ReactNode;
}

export function FullUserProvider({ children }: FullUserProviderProps) {
    const [user, setUser] = useState<FullUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch full user profile with organizations
    const fetchFullProfile = useCallback(async () => {
        try {
            setIsLoading(true);

            // Avoid hitting protected profile endpoint when there is no active session.
            const session = await authClient.getSession();
            if (!session?.data?.user) {
                setUser(null);
                setError(null);
                return;
            }

            const response = await fetch("/api/user/full-profile");
            
            if (!response.ok) {
                if (response.status === 401) {
                    setUser(null);
                    setError(null);
                    return;
                }
                throw new Error("Failed to fetch profile");
            }
            
            const data = await response.json();
            setUser(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchFullProfile();
    }, [fetchFullProfile]);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        await fetchFullProfile();
    }, [fetchFullProfile]);

    // Set active organization
    const setActiveOrganization = useCallback(async (organizationId: string | null) => {
        try {
            await authClient.organization.setActive({
                organizationId,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to set active organization");
        }
    }, []);

    // Derived state
    const organizations = user?.members ?? [];
    const linkedProviders = user?.accounts.map(a => a.providerId) ?? [];

    // Permission helpers
    const hasRole = useCallback((role: string, organizationId?: string): boolean => {
        if (!user || !organizationId) return false;
        const member = organizations.find(m => m.organizationId === organizationId);
        return member?.role === role;
    }, [user, organizations]);

    const isOwner = useCallback((organizationId?: string): boolean => {
        return hasRole("owner", organizationId);
    }, [hasRole]);

    const isAdmin = useCallback((organizationId?: string): boolean => {
        return hasRole("admin", organizationId) || hasRole("owner", organizationId);
    }, [hasRole]);

    const isMemberOf = useCallback((organizationId: string): boolean => {
        return organizations.some(m => m.organizationId === organizationId);
    }, [organizations]);

    // Provider helpers
    const hasProvider = useCallback((providerId: string): boolean => {
        return linkedProviders.includes(providerId);
    }, [linkedProviders]);

    const value: FullUserContextType = {
        user,
        isLoading,
        error,
        organizations,
        refreshUser,
        setActiveOrganization,
        hasRole,
        isOwner,
        isAdmin,
        isMemberOf,
        hasProvider,
        linkedProviders,
    };

    return (
        <FullUserContext.Provider value={value}>
            {children}
        </FullUserContext.Provider>
    );
}

export function useFullUser(): FullUserContextType {
    const context = useContext(FullUserContext);
    if (!context) {
        throw new Error("useFullUser must be used within a FullUserProvider");
    }
    return context;
}

// Optional: hook that doesn't throw if outside provider
export function useFullUserOptional(): FullUserContextType | null {
    return useContext(FullUserContext);
}
