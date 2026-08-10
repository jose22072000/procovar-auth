import { fetchUserVouchers } from "../_actions";
import { VouchersClient } from "./_vouchers-client";

export default async function VouchersPage() {
    const { data } = await fetchUserVouchers();
    return <VouchersClient vouchers={data ?? []} />;
}
