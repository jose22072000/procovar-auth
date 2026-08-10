import { fetchUserReservations } from "../_actions";
import { useProfileDataStore } from "@/stores/store.profile-data";
import type { Reservation } from "@/lib/mock-data";

/**
 * Loads the customer's reservations into the profile store.
 *
 * There is one loader on purpose. Each screen used to map the API rows itself,
 * and they did not agree: the summary card dropped `refundable` and
 * `policyType`, so whichever screen loaded last decided whether the detail page
 * could work out its cancellation rules.
 */
export async function loadReservationsIntoStore(): Promise<Reservation[]> {
    const { data } = await fetchUserReservations();
    if (!data) return [];

    const mapped: Reservation[] = data.map((r) => ({
        id: String(r.id),
        propertyName: r.propertyName ?? String(r.propertyId),
        location: r.propertyAddress ?? "—",
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: toReservationStatus(r.status),
        totalPrice: r.totalPrice / 100,
        currency: r.currency,
        roomTypeName: r.roomTypeName ?? undefined,
        guests: r.guests,
        code: r.code ?? undefined,
        refundable: r.refundable,
        policyType: r.policyType ?? undefined,
        image: undefined,
    }));

    useProfileDataStore.getState().setReservations(mapped);
    return mapped;
}

/** Maps qb-back's status vocabulary onto the three the profile screens show. */
export function toReservationStatus(status: string): Reservation["status"] {
    const s = (status ?? "").toUpperCase();
    if (s === "CANCELLED" || s === "CANCELED") return "cancelled";
    if (s === "CONFIRMED" || s === "COMPLETED") return "confirmed";
    return "pending";
}
