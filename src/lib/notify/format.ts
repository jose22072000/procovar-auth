/** Presentation helpers for inbox notifications. Client-safe (no secrets). */
import type { InboxNotification, NotificationPayload } from "./types";

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** "hace 5 min" / "5 min ago", in the user's locale. Falls back to the raw date. */
export const relativeTime = (iso: string, locale: string): string => {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) return iso;

    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    let duration = (time - Date.now()) / 1000;
    for (const division of DIVISIONS) {
        if (Math.abs(duration) < division.amount) {
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }
    return iso;
};

export const absoluteTime = (iso: string, locale: string): string => {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) return iso;
    return new Date(time).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};

/**
 * The API renders nothing: the emitter (qb-back) puts the copy in the payload.
 * If it is missing we fall back to the notification type rather than showing an
 * empty row.
 */
export const notificationTitle = (n: InboxNotification): string =>
    (n.payload?.title as string | undefined)?.trim() || n.notificationType.replace(/_/g, " ");

export const notificationBody = (n: InboxNotification): string =>
    (n.payload?.body as string | undefined)?.trim() || "";

/** Chip colour by what the notification is about. */
export const notificationColor = (
    payload: NotificationPayload,
): "primary" | "success" | "warning" | "default" => {
    if (payload.role === "owner") return "warning";
    if (payload.kind === "invoice") return "success";
    if (payload.kind === "reservation") return "primary";
    return "default";
};
