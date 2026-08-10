"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Chip, ScrollShadow } from "@heroui/react";
import { useTranslations } from "next-intl";
import type { OwnerBalancePayout } from "@/app/(user)/profile/_actions";

export type PayoutWithOrg = OwnerBalancePayout & { organizationName: string };

const STATUS_COLOR: Record<string, "success" | "warning" | "danger" | "default"> = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "danger",
    CANCELLED: "default",
};

function fmt(dateStr: string | null): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-default-400 text-xs uppercase tracking-wide">{label}</dt>
            <dd className="mt-0.5">{children}</dd>
        </div>
    );
}

export function PayoutDetailDrawer({ payout, isOpen, onClose }: { payout: PayoutWithOrg | null; isOpen: boolean; onClose: () => void }) {
    const t = useTranslations();
    const st = payout
        ? {
              label: t.has(`orgView.payoutStatus.${payout.status}`) ? t(`orgView.payoutStatus.${payout.status}`) : payout.status,
              color: STATUS_COLOR[payout.status] ?? "default",
          }
        : null;
    return (
        <Drawer isOpen={isOpen} onClose={onClose} placement="right">
            <DrawerContent>
                <DrawerHeader className="flex flex-col gap-0.5">
                    <span>{t('orgView.payoutInvoiceTitle')}</span>
                    {payout?.invoiceNumber ? <span className="text-xs font-normal text-default-400 font-mono">{payout.invoiceNumber}</span> : null}
                </DrawerHeader>
                <DrawerBody>
                    {payout && st && (
                        <div className="flex flex-col gap-5">
                            <dl className="flex flex-col gap-4 text-sm">
                                <Field label={t('orgView.totalAmount')}>
                                    <span className="text-lg font-semibold">{(payout.amount / 100).toFixed(2)} {payout.currency}</span>
                                </Field>
                                <Field label={t('orgView.statusLabel')}><Chip size="sm" variant="flat" color={st.color}>{st.label}</Chip></Field>
                                <Field label={t('orgView.organizationLabel')}>{payout.organizationName}</Field>
                                <Field label={t('orgView.conceptLabel')}>{payout.description ?? "—"}</Field>
                                <Field label={t('orgView.issueDateLabel')}>{fmt(payout.issuedAt)}</Field>
                                <Field label={t('orgView.dueDateLabel')}>{fmt(payout.dueDate)}</Field>
                                <Field label={t('orgView.paidDateLabel')}>{fmt(payout.paidAt)}</Field>
                            </dl>

                            <div>
                                <p className="text-default-400 text-xs uppercase tracking-wide mb-2">
                                    {t('orgView.reservationsIncludedCount', { count: payout.lineCount ?? payout.lines?.length ?? 0 })}
                                </p>
                                <ScrollShadow hideScrollBar className="max-h-72 rounded-md border border-default-200">
                                    {(payout.lines ?? []).length === 0 ? (
                                        <p className="p-3 text-sm text-default-400">{t('orgView.noOrgReservations')}</p>
                                    ) : (
                                        (payout.lines ?? []).map((l) => (
                                            <div key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-default-100 last:border-0">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-default-700 truncate">
                                                        {l.guestName ?? "—"}
                                                        {l.reservationCode ? <span className="ml-1 text-xs text-default-400 font-mono">#{l.reservationCode}</span> : null}
                                                    </p>
                                                    <p className="text-xs text-default-400 truncate">{l.propertyName ?? "—"}</p>
                                                </div>
                                                <span className="text-sm font-medium shrink-0">{(l.amount / 100).toFixed(2)} {payout.currency}</span>
                                            </div>
                                        ))
                                    )}
                                </ScrollShadow>
                            </div>
                        </div>
                    )}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
