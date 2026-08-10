import "server-only";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/legal/company";

/** Documents the checkout consent checkbox covers, in display order. */
export const CHECKOUT_CONSENT_DOCUMENTS = ["condiciones", "cancelaciones", "privacidad"] as const;

export interface RecordTermsAcceptanceInput {
    authUserId: string;
    invoiceId?: string | null;
    reservationId?: string | null;
    documents?: readonly string[];
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Persist the evidence that a customer accepted the legal terms before paying.
 *
 * This is a chargeback/consumer-law artefact, not a control on the payment
 * path: callers must treat a failure as non-fatal (log and continue) so a
 * write error never blocks a payment the customer already consented to.
 */
export async function recordTermsAcceptance(input: RecordTermsAcceptanceInput) {
    return prisma.termsAcceptance.create({
        data: {
            authUserId: input.authUserId,
            invoiceId: input.invoiceId ?? null,
            reservationId: input.reservationId ?? null,
            termsVersion: COMPANY.termsVersion,
            documents: [...(input.documents ?? CHECKOUT_CONSENT_DOCUMENTS)],
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
        },
        select: { id: true, createdAt: true },
    });
}

/**
 * Best-effort client IP from the proxy chain. Cloudflare fronts the site, so
 * `cf-connecting-ip` is the most reliable header; `x-forwarded-for` may carry
 * a comma-separated chain whose FIRST entry is the client.
 */
export function clientIpFromHeaders(h: Headers): string | null {
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf.trim();

    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first;
    }

    return h.get("x-real-ip")?.trim() ?? null;
}
