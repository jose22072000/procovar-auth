"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { ApiResponse } from "@/lib/types";
import { logger } from "@/lib/logger";
import { getFlowState, clearFlowState } from "@/lib/flow-state";
import { resolveSessionUser } from "@/lib/require-admin";
import { isSessionRevoked } from "@/lib/session-revocation";
import { prisma } from "@/lib/prisma";

const SESSION_RESOLVE_TIMEOUT_MS = 5000;

export const getCurrentUser = async (): Promise<ApiResponse<typeof auth.$Infer.Session.user | null>> => {
    // Fast path: resolve by session token directly in DB (avoids slower Better Auth path in dev).
    try {
        const resolved = await resolveSessionUser();
        if (resolved?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: resolved.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    isSystemAdmin: true,
                    createdAt: true,
                },
            });

            if (user) {
                logger.info("Current user session retrieved", { userId: user.id, source: "token" });
                return {
                    data: user as typeof auth.$Infer.Session.user,
                    toast: {
                        title: "Authenticated",
                        description: "User session retrieved successfully.",
                        type: "success"
                    }
                };
            }
        }
    } catch {
        // Fall back to Better Auth path below.
    }

    const session = await Promise.race([
        auth.api.getSession({ headers: await headers() }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_RESOLVE_TIMEOUT_MS)),
    ]);

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

    // Reject revoked sessions on the Better Auth fallback path too. getSession()
    // is served from the cookie cache and ignores our `revokedAt` column, so
    // without this a revoked session would still authenticate the dashboard
    // (requireAdmin) for up to the cookie-cache TTL. The fast path above already
    // rejects via resolveSessionUser().
    if (await isSessionRevoked(session.session?.id)) {
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

/**
 * Entrar con **nombre de usuario o correo**.
 *
 * En PEDIDO la gente entra con `yasmani`, `claudia.hab`, `rene`… y muchos no
 * tienen dirección de correo. better-auth solo sabe entrar por correo, así que
 * si lo que escriben no lo parece, se busca a quién pertenece ese nombre y se
 * usa su correo por debajo. Quien escriba su correo entra igual que siempre.
 *
 * Si el nombre no existe se sigue adelante con lo que sea que escribieron, para
 * que el fallo sea el mismo —"usuario o contraseña incorrectos"— tanto si el
 * nombre no existe como si la contraseña está mal. Decir "ese usuario no existe"
 * le confirma a cualquiera qué nombres son reales.
 */
export const signIn = async (identificador: string, password: string, rememberMe: boolean = true): Promise<ApiResponse> => {
    try {
        let email = identificador.trim();

        if (!email.includes("@")) {
            const persona = await prisma.user.findUnique({
                where: { username: email.toLowerCase() },
                select: { email: true },
            });
            if (persona) email = persona.email;
        }

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
            cookieStore.set("remember-email", identificador.trim(), {
                path: "/",
                maxAge: 60 * 60 * 24 * 30, // 30 days
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
        } else {
            cookieStore.delete("remember-email");
        }

        // Consume flow state and get redirect URL
        const flowState = await getFlowState();
        let redirectUrl = '/profile';
        if (flowState?.origin) {
            // External origin only: defer to /api/auth/callback (SSO flow).
            // Internal paths (e.g. /dashboard set by proxy for unauthenticated access)
            // are intentionally ignored — /profile handles role-based routing so
            // non-admin users don't land on admin-only routes.
            if (flowState.redirectOrigin && flowState.origin.startsWith('http')) {
                redirectUrl = '/api/auth/callback';
                return {
                    data: { success: true, redirectUrl },
                    toast: {
                        title: "Success",
                        description: "Signed in successfully",
                        type: "success"
                    }
                };
            }
            // Internal booking return: resume the in-progress reservation at its
            // step. Scoped to /booking so other internal paths (e.g. /dashboard)
            // still fall through to /profile.
            else if (flowState.origin.startsWith('/booking')) {
                redirectUrl = flowState.origin;
            }
        }
        await clearFlowState();

        return {
            data: { success: true, redirectUrl },
            toast: {
                title: "Success",
                description: "Signed in successfully",
                type: "success"
            }
        };

    } catch (error) {
        const e = error as Error;
        logger.error("Sign in error", { error: e.message, stack: e.stack });

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

        // Consume flow state and get redirect URL
        const flowState = await getFlowState();
        let redirectUrl = '/profile';
        if (flowState?.redirectOrigin && flowState?.origin) {
            // External origin only: defer to /api/auth/callback (SSO flow).
            // Internal paths ignored — /profile handles role-based routing.
            if (flowState.origin.startsWith('http')) {
                redirectUrl = '/api/auth/callback';
                return {
                    data: { success: true, redirectUrl },
                    toast: {
                        title: "Success",
                        description: "Account created successfully",
                        type: "success"
                    }
                };
            }
        }
        // Internal booking return: resume the in-progress reservation at its step
        // after sign-up. Scoped to /booking so other internal paths stay on /profile.
        else if (flowState?.origin?.startsWith('/booking')) {
            redirectUrl = flowState.origin;
        }
        await clearFlowState();

        return {
            data: { success: true, redirectUrl },
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
        await auth.api.signOut({
            headers: await headers(),
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
        await auth.api.requestPasswordReset({
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