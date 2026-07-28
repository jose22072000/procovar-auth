"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { ApiResponse } from "@/lib/types";
import { logger } from "@/lib/logger";
import { recordAudit, getRequestContext } from "@/lib/audit";

export const getCurrentUser = async (): Promise<ApiResponse<typeof auth.$Infer.Session.user | null>> => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return {
            data: null,
            toast: {
                title: "Not Authenticated",
                description: "No active session found.",
                type: "info"
            }
        };
    }
    logger.info("Current user session retrieved", { userId: session.user.id });
    return {
        data: session.user,
        toast: {
            title: "Authenticated",
            description: "User session retrieved successfully.",
            type: "success"
        }
    };
};

export const signIn = async (email: string, password: string, rememberMe: boolean = true): Promise<ApiResponse> => {
    try {
        await auth.api.signInEmail({
            body: {
                email,
                password,
                rememberMe,
            },
        });

        // Handle custom "Remember Email" cookie
        const cookieStore = await cookies();
        if (rememberMe) {
            cookieStore.set("remember-email", email, {
                path: "/",
                maxAge: 60 * 60 * 24 * 30, // 30 days
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
        } else {
            cookieStore.delete("remember-email");
        }

        // Auditoría: sign-in exitoso (con el client desde el que se autenticó).
        const ctx = await getRequestContext();
        const sess = await auth.api.getSession({ headers: await headers() });
        await recordAudit({
            action: "sign-in",
            status: "success",
            userId: sess?.user?.id ?? null,
            organizationId: sess?.session?.activeOrganizationId ?? null,
            clientId: ctx.clientId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { email },
        });

        return {
            data: { success: true },
            toast: {
                title: "Success",
                description: "Signed in successfully",
                type: "success"
            }
        };

    } catch (error) {
        const e = error as Error;
        logger.error("Sign in error", { error: e.message, stack: e.stack });

        // Auditoría: intento fallido de sign-in.
        const ctx = await getRequestContext();
        await recordAudit({
            action: "sign-in",
            status: "failure",
            clientId: ctx.clientId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { email },
        });

        // Hide technical errors from the user
        const isTechnicalError =
            e.message.includes("Prisma") ||
            e.message.includes("generate") ||
            e.message.includes("database") ||
            e.message.includes("connect");

        // Generic error message for auth failures to prevent user enumeration
        const errorMessage = isTechnicalError
            ? "User does not exist or password is incorrect"
            : "Invalid email or password";

        return {
            errors: { root: errorMessage },
            toast: {
                title: "Error",
                description: errorMessage,
                type: "error"
            }
        };
    }
};

export const signUp = async (name: string, email: string, password: string): Promise<ApiResponse> => {
    try {
        await auth.api.signUpEmail({
            body: {
                name,
                email,
                password,
            },
        });

        const ctx = await getRequestContext();
        const sess = await auth.api.getSession({ headers: await headers() });
        await recordAudit({
            action: "sign-up",
            status: "success",
            userId: sess?.user?.id ?? null,
            clientId: ctx.clientId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { email, name },
        });

        return {
            data: { success: true },
            toast: {
                title: "Success",
                description: "Account created successfully",
                type: "success"
            }
        };
    } catch (error) {
        const e = error as Error;
        logger.error("Sign up error", { error: e.message, stack: e.stack });

        return {
            errors: { root: e.message },
            toast: {
                title: "Error",
                description: e.message || "Failed to create account",
                type: "error"
            }
        };
    }
};

export const signOut = async (): Promise<ApiResponse> => {
    try {
        // Capturar quién/desde-qué-client antes de cerrar la sesión.
        const ctx = await getRequestContext();
        const sess = await auth.api.getSession({ headers: await headers() });

        await auth.api.signOut({
            headers: await headers(),
        });

        await recordAudit({
            action: "sign-out",
            status: "success",
            userId: sess?.user?.id ?? null,
            organizationId: sess?.session?.activeOrganizationId ?? null,
            clientId: ctx.clientId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
        });

        return {
            data: { success: true },
            toast: {
                title: "Success",
                description: "Signed out successfully",
                type: "success"
            }
        };
    } catch (error) {
        const e = error as Error;
        logger.error("Sign out error", { error: e.message });
        return {
            errors: { root: "Failed to sign out" },
            toast: {
                title: "Error",
                description: "Failed to sign out. Please try again.",
                type: "error"
            }
        };
    }
};

export const forgotPassword = async (email: string): Promise<ApiResponse> => {
    try {
        await auth.api.forgetPassword({
            body: {
                email,
                redirectTo: "/reset-password",
            },
        });
        return {
            data: { success: true },
            toast: {
                title: "Success",
                description: "If an account exists, a password reset email has been sent.",
                type: "success"
            }
        };
    } catch (error) {
        const e = error as Error;
        logger.error("Forgot password error", { error: e.message });
        return {
            errors: { root: e.message },
            toast: {
                title: "Error",
                description: "Failed to send reset email.",
                type: "error"
            }
        };
    }
};

export const resetPassword = async (password: string, token: string): Promise<ApiResponse> => {
    try {
        await auth.api.resetPassword({
            body: {
                newPassword: password,
                token,
            },
        });

        const ctx = await getRequestContext();
        await recordAudit({
            action: "password-reset",
            status: "success",
            clientId: ctx.clientId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
        });

        return {
            data: { success: true },
            toast: {
                title: "Success",
                description: "Password reset successfully",
                type: "success"
            }
        };
    } catch (error) {
        const e = error as Error;
        logger.error("Reset password error", { error: e.message });
        return {
            errors: { root: e.message },
            toast: {
                title: "Error",
                description: "Failed to reset password.",
                type: "error"
            }
        };
    }
};