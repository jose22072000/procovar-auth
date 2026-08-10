"use server";

import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { getSessionCookieName } from "@/lib/flow-state";
import { prisma } from "@/lib/prisma";

// ─── Backend response types ───────────────────────────────────────────────────

export interface BackendInvoice {
    id: string;
    invoiceNumber: string;
    description: string;
    amount: number; // cents
    currency: string;
    propertyName?: string | null;
    propertyAddress?: string | null;
    status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "FAILED" | "REFUNDED";
    issuedAt: string;
    dueDate: string | null;
    customerAuthUserId: string;
    ownerAuthUserId?: string;
    metadata?: Record<string, unknown>;
}

export interface BackendReservation {
    id: string;
    customerAuthUserId: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number; // cents
    currency: string;
    status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
    createdAt?: string;
    propertyName?: string | null;
    propertyAddress?: string | null;
    roomTypeName?: string | null;
    code?: string | null;
    refundable?: boolean;
    policyType?: string | null;
    guestName?: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
}

function authHeader(): string {
    const token = process.env.BEARER_TOKEN ?? "local-dev-bearer-token-00000000000000000000000000000";
    return `Bearer ${token}`;
}

// Server-side calls from inside Docker can't reach localhost — use gateway IP.
function getBackendUrl(): string | null {
    const url = process.env.QB_BACKEND_URL;
    if (!url) return null;
    if (/localhost/.test(url)) return "http://172.23.0.1:5100/api";
    return url;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function fetchUserInvoices(): Promise<{ data: BackendInvoice[] | null; error: string | null }> {
    try {
        const userId = await getAuthUserId();
        if (!userId) return { data: null, error: "Not authenticated" };

        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: "BACKEND_URL not configured" };

        const res = await fetch(`${backendUrl}/finance/invoices`, {
            headers: { Authorization: authHeader() },
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as any).message ?? `HTTP ${res.status}` };
        }

        const json = await res.json();
        const all: BackendInvoice[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: all.filter((inv) => inv.customerAuthUserId === userId), error: null };
    } catch (e: any) {
        return { data: null, error: e.message ?? "Unknown error" };
    }
}

export async function fetchOwnerInvoiceIncome(): Promise<{ data: BackendInvoice[] | null; error: string | null }> {
    try {
        const userId = await getAuthUserId();
        if (!userId) return { data: null, error: "Not authenticated" };

        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: "BACKEND_URL not configured" };

        const res = await fetch(`${backendUrl}/finance/invoices`, {
            headers: { Authorization: authHeader() },
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as any).message ?? `HTTP ${res.status}` };
        }

        const json = await res.json();
        const all: BackendInvoice[] = Array.isArray(json) ? json : (json.data ?? []);
        const filtered = all.filter((inv) => inv.ownerAuthUserId === userId);
        return { data: filtered, error: null };
    } catch (e: any) {
        return { data: null, error: e.message ?? "Unknown error" };
    }
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export async function fetchUserReservations(): Promise<{ data: BackendReservation[] | null; error: string | null }> {
    try {
        const userId = await getAuthUserId();
        if (!userId) return { data: null, error: "Not authenticated" };

        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: "BACKEND_URL not configured" };

        const res = await fetch(`${backendUrl}/reservations`, {
            headers: { Authorization: authHeader() },
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as any).message ?? `HTTP ${res.status}` };
        }

        const json = await res.json();
        const all: BackendReservation[] = Array.isArray(json) ? json : (json.data ?? []);
        const filtered = all.filter((r) => r.customerAuthUserId === userId);
        return { data: filtered, error: null };
    } catch (e: any) {
        return { data: null, error: e.message ?? "Unknown error" };
    }
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────
//
// GET /vouchers?customerAuthUserId= is qb-back's customer self-service voucher
// list (discounts module) — the caller may only read THEIR OWN vouchers.
// qb-back checks that by comparing the REQUEST's resolved identity (auth.
// FromContext(r).UserID) against customerAuthUserId, so the BEARER_TOKEN alone
// is not enough (it's a bypass identity with no UserID) — the session cookie
// MUST be forwarded too, same as requestReservationCancel/invoiceAction below.
// qb-back only returns the opaque issuing organizationId (a qb-auth org id);
// qb-auth owns Organization identity, so the name is resolved here via Prisma
// rather than asking qb-back to look it up.

// One voucher_usages row (Gap 4) — the per-reservation spend breakdown.
// reservationId is "" on the (never expected in practice, but schema-legal)
// chance the usage's reservation was deleted (voucher_usages.reservation_id
// is ON DELETE SET NULL server-side — qb-back's VoucherUsageResponse).
export interface BackendVoucherUsage {
    reservationId: string;
    amountApplied: number; // cents
    at: string; // ISO timestamp
}

export interface BackendVoucher {
    id: string;
    code: string;
    customerId: string;
    amount: number; // cents
    remaining: number; // cents — amount minus Σ usages, computed server-side
    currency: string;
    reason: string;
    status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
    validFrom: string;
    validUntil: string;
    usedAt: string | null;
    organizationId: string;
    // Gap 4 — every voucher_usages row for this voucher, newest data straight
    // from qb-back (discounts/service.go's toVoucherResponse). Empty array
    // (never omitted) when the voucher hasn't been spent yet.
    usages: BackendVoucherUsage[];
}

export interface CustomerVoucherView extends BackendVoucher {
    organizationName: string;
}

export async function fetchUserVouchers(): Promise<{ data: CustomerVoucherView[] | null; error: string | null }> {
    try {
        const userId = await getAuthUserId();
        if (!userId) return { data: null, error: "Not authenticated" };

        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: "BACKEND_URL not configured" };

        const sessionToken = (await cookies()).get(getSessionCookieName())?.value;
        const reqHeaders: Record<string, string> = { Authorization: authHeader() };
        if (sessionToken) reqHeaders["Cookie"] = `qb.session_token=${sessionToken}`;

        const res = await fetch(`${backendUrl}/vouchers?customerAuthUserId=${encodeURIComponent(userId)}`, {
            headers: reqHeaders,
            cache: "no-store",
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
        }

        const json = await res.json();
        const items: BackendVoucher[] = Array.isArray(json) ? json : (json.data ?? []);

        const orgIds = Array.from(new Set(items.map((v) => v.organizationId).filter(Boolean)));
        let orgNames: Record<string, string> = {};
        if (orgIds.length > 0) {
            const orgs = await prisma.organization.findMany({
                where: { id: { in: orgIds } },
                select: { id: true, name: true },
            });
            orgNames = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
        }

        return {
            data: items.map((v) => ({ ...v, organizationName: orgNames[v.organizationId] ?? v.organizationId })),
            error: null,
        };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
    }
}

// ─── Org / Owner data ─────────────────────────────────────────────────────────

export interface BackendProperty {
    id: string;
    name: string;
    slug: string;
    organizationId: string;
    isLive: boolean;
    avgRating: number | null;
    reviewCount: number;
    currency: string;
}

export interface BackendPayout {
    id: string;
    amount: number; // cents
    currency: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    reason: string;
    paidAt: string | null;
    propertyId: string | null;
}

export interface BackendOwnerMember {
    id: string;
    role: string;
    organizationId: string;
}

/** Returns true if an Owner record exists in qb-back for this authUserId. */
export async function checkOwnerRecord(authUserId: string): Promise<boolean> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return false;
        const res = await fetch(
            `${backendUrl}/users/owners?authUserId=${encodeURIComponent(authUserId)}`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) return false;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length > 0;
    } catch {
        return false;
    }
}

export async function fetchOrgProperties(
    organizationId: string
): Promise<{ data: BackendProperty[] | null; error: string | null }> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const res = await fetch(
            `${backendUrl}/properties?organizationId=${encodeURIComponent(organizationId)}`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
        }
        const json = await res.json();
        const items: BackendProperty[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchOrgReservations(
    propertyIds: string[],
    checkInFrom?: string
): Promise<{ data: BackendReservation[] | null; error: string | null }> {
    if (propertyIds.length === 0) return { data: [], error: null };
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const results = await Promise.all(
            propertyIds.map(async (pid) => {
                const params = new URLSearchParams({ propertyId: pid });
                if (checkInFrom) params.set('checkInFrom', checkInFrom);
                const res = await fetch(`${backendUrl}/reservations?${params}`, {
                    headers: { Authorization: authHeader() },
                    cache: 'no-store',
                });
                if (!res.ok) return [] as BackendReservation[];
                const json = await res.json();
                return (Array.isArray(json) ? json : (json.data ?? [])) as BackendReservation[];
            })
        );
        return { data: results.flat(), error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchOrgPayouts(
    authUserId: string,
    paidAtFrom?: string
): Promise<{ data: BackendPayout[] | null; error: string | null }> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const params = new URLSearchParams({ ownerAuthUserId: authUserId });
        if (paidAtFrom) params.set('paidAtFrom', paidAtFrom);
        const res = await fetch(`${backendUrl}/finance/payouts?${params}`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
        }
        const json = await res.json();
        const items: BackendPayout[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchPlatformPropertyCount(): Promise<number> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return 0;
        const res = await fetch(`${backendUrl}/properties?isLive=true&limit=9999`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) return 0;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length;
    } catch {
        return 0;
    }
}

export async function fetchPlatformReservationCount(checkInFrom: string): Promise<number> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return 0;
        const res = await fetch(
            `${backendUrl}/reservations?checkInFrom=${encodeURIComponent(checkInFrom)}&limit=9999`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) return 0;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length;
    } catch {
        return 0;
    }
}

export async function fetchAllPlatformReservations(): Promise<{ data: BackendReservation[] | null; error: string | null }> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const res = await fetch(`${backendUrl}/reservations?limit=9999`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) return { data: [], error: null };
        const json = await res.json();
        const items: BackendReservation[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch {
        return { data: [], error: null };
    }
}

export async function fetchAllPlatformProperties(): Promise<{ data: BackendProperty[] | null; error: string | null }> {
    try {
        const backendUrl = getBackendUrl();
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const res = await fetch(`${backendUrl}/properties?limit=9999`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) return { data: [], error: null };
        const json = await res.json();
        const items: BackendProperty[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch {
        return { data: [], error: null };
    }
}

// ─── Owner Balance ────────────────────────────────────────────────────────────

export interface OwnerPayoutLine {
  id: string; amount: number
  reservationId: string | null; reservationCode: string | null; guestName: string | null; propertyName: string | null
}
// A payout invoice toward the owner (accumulates reservation lines).
export interface OwnerBalancePayout {
  id: string; invoiceNumber: string | null; amount: number; currency: string; status: string
  description: string | null; issuedAt: string; dueDate: string | null; createdAt: string; paidAt: string | null
  organizationId: string | null; lineCount: number; lines: OwnerPayoutLine[]
}
export interface OwnerBalance { availableCents: number; pendingCents: number; payouts: OwnerBalancePayout[] }

export async function fetchOwnerBalance(): Promise<{ data: OwnerBalance | null; error: string | null }> {
  try {
    const userId = await getAuthUserId()
    if (!userId) return { data: null, error: 'Not authenticated' }
    const backendUrl = getBackendUrl()
    if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' }
    const res = await fetch(`${backendUrl}/finance/owner-balance?ownerAuthUserId=${encodeURIComponent(userId)}`, {
      headers: { Authorization: authHeader() }, cache: 'no-store',
    })
    if (!res.ok) return { data: null, error: `HTTP ${res.status}` }
    const json = await res.json()
    return { data: { availableCents: json.availableCents ?? 0, pendingCents: json.pendingCents ?? 0, payouts: json.payouts ?? [] }, error: null }
  } catch (e: any) {
    return { data: null, error: e.message ?? 'Unknown error' }
  }
}

// ─── Reservation Cancel ───────────────────────────────────────────────────────

export async function requestReservationCancel(
	reservationId: string,
	reason?: string,
): Promise<{ ok: boolean; status?: string; error?: string; refund?: { refundableAmount: number | null; chargeAmount: number | null; eligibility: string; currency: string } }> {
	try {
		const backendUrl = process.env.QB_BACKEND_URL;
		const bearer = (process.env.BEARER_TOKEN);
		if (!backendUrl || !bearer) return { ok: false, error: "config" };

		const sessionToken = (await cookies()).get(getSessionCookieName())?.value;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${bearer}`,
		};
		if (sessionToken) headers["Cookie"] = `qb.session_token=${sessionToken}`;

		const res = await fetch(`${backendUrl}/reservations/${reservationId}/cancel`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify(reason ? { reason } : {}),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return { ok: false, error: (body as any)?.code ?? (body as any)?.message ?? `HTTP ${res.status}` };
		}
		const body = await res.json().catch(() => ({}));
		return { ok: true, status: (body as any)?.status, refund: (body as any)?.refund };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "network" };
	}
}

// ─── Acciones del cliente sobre SU factura ───────────────────────────────────
//
// Reglas de negocio (las impone qb-back, no la UI — el id lo pone el atacante):
//   PENDIENTE  → se puede cancelar; y una vez cancelada, eliminar.
//   PAGADA     → ni cancelar ni eliminar. Eso se deshace con un reembolso, no borrando
//                el papel.
// El «eliminar» es lógico: la factura es un registro contable, se oculta pero no se
// destruye el rastro.
//
// Antes esto NO existía: el botón llamaba a `deleteInvoice` de un store de Zustand, que
// solo quitaba la factura de la pantalla. Al recargar volvía.
//
// Se reenvía la cookie de sesión además del bearer de servicio: qb-back le da prioridad
// a la sesión, y es de ahí de donde saca QUIÉN eres para comprobar que la factura es
// tuya. Solo con el bearer, `req.auth.userId` va vacío.

async function invoiceAction(
	invoiceId: string,
	method: "POST" | "DELETE",
	path = "",
): Promise<{ ok: boolean; error?: string }> {
	try {
		const userId = await getAuthUserId();
		if (!userId) return { ok: false, error: "Not authenticated" };

		const backendUrl = getBackendUrl();
		if (!backendUrl) return { ok: false, error: "QB_BACKEND_URL not configured" };

		const sessionToken = (await cookies()).get(getSessionCookieName())?.value;
		const headers: Record<string, string> = { Authorization: authHeader() };
		if (sessionToken) headers["Cookie"] = `qb.session_token=${sessionToken}`;

		const res = await fetch(`${backendUrl}/finance/invoices/${invoiceId}${path}`, {
			method,
			headers,
			cache: "no-store",
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return { ok: false, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
		}
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
	}
}

/** Anula una factura PENDIENTE. Una pagada devuelve 409. */
export async function cancelInvoice(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
	return invoiceAction(invoiceId, "POST", "/cancel");
}

/** Elimina (lógicamente) una factura ya CANCELADA. Una pendiente o pagada devuelve 409. */
export async function deleteInvoice(invoiceId: string): Promise<{ ok: boolean; error?: string }> {
	return invoiceAction(invoiceId, "DELETE");
}
