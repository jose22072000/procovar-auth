import { loadOrgReservationsForCurrentUser } from "./_load";
import { OrgReservationsClient } from "./_org-reservations-client";

export default async function OrgReservationsPage() {
    const reservations = await loadOrgReservationsForCurrentUser();
    return <OrgReservationsClient reservations={reservations} />;
}
