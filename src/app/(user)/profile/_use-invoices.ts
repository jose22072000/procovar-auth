"use client";

import { useEffect, useState } from "react";
import { useProfileDataStore } from "@/stores/store.profile-data";
import type { Invoice, InvoiceStatus } from "@/lib/mock-data";
import { fetchUserInvoices } from "./_actions";

/**
 * Carga las facturas del usuario en el store.
 *
 * Existe porque el DETALLE de una factura solo leía del store, y el store solo lo
 * rellenaba el LISTADO. Entrando por el listado funcionaba; entrando DIRECTO —desde una
 * notificación en qb-booking, un enlace compartido o un marcador— el store estaba vacío,
 * `invoices.find(...)` no encontraba nada y la página decía «no se encontró» sobre una
 * factura que existe perfectamente.
 *
 * Una vista de detalle tiene que poder cargarse sola. Esto es lo que se lo permite.
 */
const toUIStatus = (status: string): InvoiceStatus => {
    const s = status.toUpperCase();
    if (s === "PAID") return "paid";
    if (s === "OVERDUE") return "overdue";
    if (s === "CANCELLED") return "cancelled";
    if (s === "REFUND_REQUESTED") return "refund_requested";
    if (s === "REFUNDED") return "refunded";
    return "pending";
};

export const useInvoices = (): { invoices: Invoice[]; loading: boolean; reload: () => void } => {
    const invoices = useProfileDataStore((s) => s.invoices);
    const setInvoices = useProfileDataStore((s) => s.setInvoices);
    const [loading, setLoading] = useState(true);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let alive = true;
        fetchUserInvoices().then(({ data }) => {
            if (!alive) return;
            setInvoices(
                (data ?? []).map((inv) => ({
                    id: String(inv.id),
                    invoiceNumber: inv.invoiceNumber ?? "",
                    description: inv.description ?? "",
                    amount: inv.amount / 100,
                    date: new Date(inv.issuedAt),
                    dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
                    status: toUIStatus(inv.status),
                    propertyName: inv.propertyName ?? "—",
                    propertyAddress: inv.propertyAddress ?? "—",
                    currency: inv.currency,
                    category: "rental" as const,
                    paymentMethod: "—",
                    period: undefined,
                })),
            );
            setLoading(false);
        });
        return () => {
            alive = false;
        };
    }, [setInvoices, nonce]);

    /**
     * Tiempo real. qb-back publica en el canal personal del usuario cuando le cambia una
     * factura o una reserva; aquí se recarga al instante, en todas las pestañas abiertas.
     * Sin esto, cancelabas en una y la otra seguía diciendo «Pendiente».
     */
    useEffect(() => {
        const es = new EventSource("/api/events");
        es.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data) as { type?: string };
                if (data.type === "reservation" || data.type === "notification") {
                    setNonce((n) => n + 1);
                }
            } catch {
                // Un evento ilegible no debe tumbar el stream.
            }
        };
        return () => es.close();
    }, []);

    return { invoices, loading, reload: () => setNonce((n) => n + 1) };
};
