// The product shows 4 reservation states, DERIVED from the reservation's fields
// (status + checkOut date) — not stored separately. Single source of truth.
//   Pendiente   → PENDING (esperando pago)
//   Confirmada  → pagada, con la salida aún por delante (próxima o en curso)
//   Completada  → pagada y la salida (checkOut) ya pasó
//   Cancelada   → CANCELLED / NO_SHOW
export type ResBiz = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export const RES_FILTERS: ResBiz[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export const resBizOf = (status: string, checkOut?: string | null, now: number = Date.now()): ResBiz => {
    if (status === "CANCELLED" || status === "NO_SHOW") return "CANCELLED";
    if (status === "PENDING") return "PENDING";
    // Paid family (CONFIRMED / CHECKED_IN / CHECKED_OUT): completed once the stay's checkout passed.
    if (checkOut && new Date(checkOut).getTime() < now) return "COMPLETED";
    return "CONFIRMED";
};

// Labels are NOT stored here — this util only derives the stable status key +
// color. Consumers translate the key via `t('orgView.status.' + key)`, which
// already carries all 4 ResBiz values in both locale bundles.
export const RES_STATUS: Record<ResBiz, { color: "success" | "warning" | "danger" | "default" }> = {
    PENDING: { color: "warning" },
    CONFIRMED: { color: "success" },
    COMPLETED: { color: "default" },
    CANCELLED: { color: "danger" },
};

export const resStatusMeta = (status: string, checkOut?: string | null) => RES_STATUS[resBizOf(status, checkOut)];
