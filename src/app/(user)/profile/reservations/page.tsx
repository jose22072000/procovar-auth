import { getSystemConfig } from "@/lib/system-config";
import { ReservationsClient } from "./_reservations-client";

export default async function ReservationsPage() {
    const bookingUrl = await getSystemConfig('QB_BOOKING_URL') ?? null;
    return <ReservationsClient bookingUrl={bookingUrl} />;
}
