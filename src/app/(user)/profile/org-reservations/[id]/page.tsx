import { loadOrgReservationsForCurrentUser } from "../_load";
import { OrgReservationDetail } from "@/components/profile/org-view/org-reservation-detail";

export default async function OrgReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const reservations = await loadOrgReservationsForCurrentUser();
    const reservation = reservations.find((r) => r.id === id) ?? null;
    return <OrgReservationDetail reservation={reservation} />;
}
