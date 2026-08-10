import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    Invoice,
    Service,
    Notification,
    NotificationType,
    Reservation,
} from "@/lib/mock-data";

export interface NotificationSettings {
    emailNotifications: boolean;
    bookingConfirmations: boolean;
    invoiceAlerts: boolean;
    serviceAlerts: boolean;
    marketingEmails: boolean;
}

function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function todayLabel(): string {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface ProfileDataState {
    invoices: Invoice[];
    ownerInvoices: Invoice[];
    services: Service[];
    notifications: Notification[];
    reservations: Reservation[];
    deletedNotificationIds: string[];
    deletedReservationIds: string[];
    deletedInvoiceIds: string[];
    notificationSettings: NotificationSettings;

    // Notifications
    setNotifications: (notifications: Notification[]) => void;
    markNotificationRead: (id: string) => void;
    markNotificationUnread: (id: string) => void;
    markAllNotificationsRead: () => void;
    deleteNotification: (id: string) => void;
    deleteAllNotifications: () => void;
    addNotification: (n: Omit<Notification, "id">) => void;

    // Reservations
    setReservations: (reservations: Reservation[]) => void;
    setReservationStatus: (id: string, status: "confirmed" | "pending" | "cancelled") => void;
    deleteReservation: (id: string) => void;

    // Invoices
    setInvoices: (invoices: Invoice[]) => void;
    setOwnerInvoices: (invoices: Invoice[]) => void;
    payInvoice: (id: string) => void;
    deleteInvoice: (id: string) => void;

    // Services
    toggleServiceStatus: (id: string) => void;
    deleteService: (id: string) => void;

    // Settings
    updateNotificationSettings: (s: Partial<NotificationSettings>) => void;
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[], deletedIds: string[] = []): T[] {
    const deleted = new Set(deletedIds);
    const merged = [...current];
    const existingIds = new Set(current.map((item) => item.id));

    for (const item of incoming) {
        if (deleted.has(item.id)) continue;

        if (!existingIds.has(item.id)) {
            merged.push(item);
        }
    }

    return merged.filter((item) => !deleted.has(item.id));
}

export const useProfileDataStore = create<ProfileDataState>()(
    persist(
        (set, get) => ({
            invoices: [],
            ownerInvoices: [],
            services: [],
            notifications: [],
            reservations: [],
            deletedNotificationIds: [],
            deletedReservationIds: [],
            deletedInvoiceIds: [],
            notificationSettings: {
                emailNotifications: true,
                bookingConfirmations: true,
                invoiceAlerts: true,
                serviceAlerts: true,
                marketingEmails: false,
            },

            // Notifications
            setNotifications: (notifications) =>
                set((state) => ({
                    notifications: mergeById(state.notifications, notifications, state.deletedNotificationIds),
                })),
            markNotificationRead: (id) =>
                set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
            markNotificationUnread: (id) =>
                set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: false } : n) })),
            markAllNotificationsRead: () =>
                set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
            deleteNotification: (id) =>
                set((s) => ({
                    notifications: s.notifications.filter((n) => n.id !== id),
                    deletedNotificationIds: s.deletedNotificationIds.includes(id) ? s.deletedNotificationIds : [...s.deletedNotificationIds, id],
                })),
            deleteAllNotifications: () =>
                set((s) => ({
                    notifications: [],
                    deletedNotificationIds: Array.from(new Set([...s.deletedNotificationIds, ...s.notifications.map((n) => n.id)])),
                })),
            addNotification: (n) => {
                const newNotif: Notification = { ...n, id: generateId("NOT") };
                set((s) => ({ notifications: [newNotif, ...s.notifications] }));
            },

            // Reservations
            setReservations: (reservations) =>
                set(() => ({ reservations })),
            setReservationStatus: (id, status) =>
                set((s) => ({
                    reservations: s.reservations.map((r) => (r.id === id ? { ...r, status } : r)),
                })),
            deleteReservation: (id) =>
                set((s) => ({
                    reservations: s.reservations.filter((r) => r.id !== id),
                    deletedReservationIds: s.deletedReservationIds.includes(id) ? s.deletedReservationIds : [...s.deletedReservationIds, id],
                })),

            // Invoices
            setInvoices: (invoices) => set(() => ({ invoices })),
            setOwnerInvoices: (invoices) => set(() => ({ ownerInvoices: invoices })),
            payInvoice: (id) => {
                const inv = get().invoices.find((i) => i.id === id);
                if (!inv) return;
                set((s) => ({
                    invoices: s.invoices.map((i) => i.id === id ? { ...i, status: "paid" as const } : i),
                    notifications: [{ id: generateId("NOT"), title: "Payment confirmed", message: `Your payment for invoice ${inv.invoiceNumber} has been processed.`, date: todayLabel(), read: false, type: "invoice" as NotificationType, relatedId: id }, ...s.notifications],
                }));
            },
            deleteInvoice: (id) =>
                set((s) => ({
                    invoices: s.invoices.filter((i) => i.id !== id),
                    deletedInvoiceIds: s.deletedInvoiceIds.includes(id) ? s.deletedInvoiceIds : [...s.deletedInvoiceIds, id],
                })),
            // Services
            toggleServiceStatus: (id) => {
                const svc = get().services.find((s) => s.id === id);
                if (!svc) return;
                const newStatus = svc.status === "active" ? "expired" : "active";
                const action = newStatus === "active" ? "Service activated" : "Service deactivated";
                set((s) => ({
                    services: s.services.map((sv) => sv.id === id ? { ...sv, status: newStatus as "active" | "expired" } : sv),
                    notifications: [{ id: generateId("NOT"), title: action, message: `${svc.name} for ${svc.propertyName} is now ${newStatus}.`, date: todayLabel(), read: false, type: "service" as NotificationType, relatedId: id }, ...s.notifications],
                }));
            },
            deleteService: (id) =>
                set((s) => ({ services: s.services.filter((sv) => sv.id !== id) })),

            // Settings
            updateNotificationSettings: (s) =>
                set((state) => ({ notificationSettings: { ...state.notificationSettings, ...s } })),
        }),
        {
            name: 'profile-data-storage',
            version: 8,
            migrate: () => {
                // v8: replace-instead-of-merge; clear all cached user data
                return {
                    invoices: [],
                    ownerInvoices: [],
                    services: [],
                    notifications: [],
                    reservations: [],
                    deletedNotificationIds: [],
                    deletedReservationIds: [],
                    deletedInvoiceIds: [],
                    notificationSettings: {
                        emailNotifications: true,
                        bookingConfirmations: true,
                        invoiceAlerts: true,
                        serviceAlerts: true,
                        marketingEmails: false,
                    },
                };
            },
        }
    )
);
