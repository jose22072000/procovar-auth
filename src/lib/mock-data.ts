export interface Reservation {
    id: string;
    propertyName: string;
    location: string;
    checkIn: string;
    checkOut: string;
    status: "confirmed" | "pending" | "cancelled";
    totalPrice: number;
    currency: string;
    roomTypeName?: string;
    guests?: number;
    code?: string;
    refundable?: boolean;
    policyType?: string;
    image?: string;
}

export const mockReservations: Reservation[] = [
    {
        id: "res-001",
        propertyName: "Ocean View Villa",
        location: "Miami, FL",
        checkIn: "2025-07-01",
        checkOut: "2025-07-07",
        status: "confirmed",
        totalPrice: 1400,
        currency: "EUR",
    },
    {
        id: "res-002",
        propertyName: "Mountain Cabin",
        location: "Aspen, CO",
        checkIn: "2025-08-15",
        checkOut: "2025-08-20",
        status: "pending",
        totalPrice: 750,
        currency: "EUR",
    },
    {
        id: "res-003",
        propertyName: "City Center Apartment",
        location: "New York, NY",
        checkIn: "2025-06-10",
        checkOut: "2025-06-14",
        status: "cancelled",
        totalPrice: 600,
        currency: "EUR",
    },
    {
        id: "res-004",
        propertyName: "Beachfront Cottage",
        location: "Malibu, CA",
        checkIn: "2025-09-01",
        checkOut: "2025-09-08",
        status: "confirmed",
        totalPrice: 2100,
        currency: "EUR",
    },
    {
        id: "res-005",
        propertyName: "Desert Retreat",
        location: "Sedona, AZ",
        checkIn: "2025-10-05",
        checkOut: "2025-10-10",
        status: "confirmed",
        totalPrice: 900,
        currency: "EUR",
    },
    {
        id: "res-006",
        propertyName: "Historic Downtown Loft",
        location: "Chicago, IL",
        checkIn: "2025-07-20",
        checkOut: "2025-07-23",
        status: "pending",
        totalPrice: 480,
        currency: "EUR",
    },
    {
        id: "res-007",
        propertyName: "Lakeside Bungalow",
        location: "Lake Tahoe, CA",
        checkIn: "2025-08-01",
        checkOut: "2025-08-06",
        status: "confirmed",
        totalPrice: 1050,
        currency: "EUR",
    },
    {
        id: "res-008",
        propertyName: "Vineyard Estate",
        location: "Napa Valley, CA",
        checkIn: "2025-11-10",
        checkOut: "2025-11-14",
        status: "cancelled",
        totalPrice: 1600,
        currency: "EUR",
    },
    {
        id: "res-009",
        propertyName: "Ski Chalet",
        location: "Vail, CO",
        checkIn: "2025-12-20",
        checkOut: "2025-12-27",
        status: "pending",
        totalPrice: 3200,
        currency: "EUR",
    },
    {
        id: "res-010",
        propertyName: "Tropical Beach House",
        location: "Honolulu, HI",
        checkIn: "2026-01-05",
        checkOut: "2026-01-12",
        status: "confirmed",
        totalPrice: 2800,
        currency: "EUR",
    },
];

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled" | "refund_requested" | "refunded";

export interface Invoice {
    id: string;
    propertyName: string;
    propertyAddress: string;
    amount: number;
    date: Date;
    dueDate?: Date;
    period?: string;
    status: InvoiceStatus;
    description: string;
    category: "rental" | "service" | "deposit" | "maintenance" | "utility";
    paymentMethod: string;
    invoiceNumber: string;
    currency: string;
}

export const mockInvoices: Invoice[] = [
    {
        id: "INV-001",
        propertyName: "Villa Sunset",
        propertyAddress: "Calle Malaga 42, Marbella",
        amount: 1250,
        date: new Date("2026-03-15"),
        dueDate: new Date("2026-04-15"),
        period: "March 2026",
        status: "paid",
        description: "Monthly rental - March 2026",
        category: "rental",
        paymentMethod: "Credit Card",
        invoiceNumber: "INV-2026-0001",
        currency: "EUR",
    },
    {
        id: "INV-002",
        propertyName: "Penthouse City",
        propertyAddress: "Avenida Diagonal 150, Barcelona",
        amount: 950,
        date: new Date("2026-03-10"),
        dueDate: new Date("2026-04-10"),
        period: "March 2026",
        status: "pending",
        description: "Monthly rental - March 2026",
        category: "rental",
        paymentMethod: "Bank Transfer",
        invoiceNumber: "INV-2026-0002",
        currency: "EUR",
    },
    {
        id: "INV-003",
        propertyName: "Beach House",
        propertyAddress: "Paseo Maritimo 88, Valencia",
        amount: 2100,
        date: new Date("2026-02-28"),
        dueDate: new Date("2026-03-30"),
        period: "February 2026",
        status: "paid",
        description: "Monthly rental - February 2026",
        category: "rental",
        paymentMethod: "Credit Card",
        invoiceNumber: "INV-2026-0003",
        currency: "EUR",
    },
    {
        id: "INV-004",
        propertyName: "Villa Sunset",
        propertyAddress: "Calle Malaga 42, Marbella",
        amount: 180,
        date: new Date("2026-03-18"),
        dueDate: new Date("2026-04-01"),
        period: "March 2026",
        status: "overdue",
        description: "Cleaning service - March",
        category: "service",
        paymentMethod: "Credit Card",
        invoiceNumber: "INV-2026-0011",
        currency: "EUR",
    },
    {
        id: "INV-005",
        propertyName: "Mountain Cabin",
        propertyAddress: "Calle Sierra 12, Benasque",
        amount: 650,
        date: new Date("2026-02-20"),
        dueDate: new Date("2026-03-20"),
        period: "February 2026",
        status: "paid",
        description: "Monthly rental - February 2026",
        category: "rental",
        paymentMethod: "PayPal",
        invoiceNumber: "INV-2026-0004",
        currency: "EUR",
    },
    {
        id: "INV-006",
        propertyName: "City Apartment",
        propertyAddress: "Gran Via 200, Madrid",
        amount: 450,
        date: new Date("2026-02-15"),
        dueDate: new Date("2026-03-15"),
        period: "February 2026",
        status: "pending",
        description: "Monthly rental - February 2026",
        category: "rental",
        paymentMethod: "Bank Transfer",
        invoiceNumber: "INV-2026-0005",
        currency: "EUR",
    },
    {
        id: "INV-007",
        propertyName: "Lake House",
        propertyAddress: "Lago Sanabria 5, Zamora",
        amount: 1800,
        date: new Date("2026-02-10"),
        dueDate: new Date("2026-03-10"),
        period: "February 2026",
        status: "paid",
        description: "Security deposit refund",
        category: "deposit",
        paymentMethod: "Bank Transfer",
        invoiceNumber: "INV-2026-0006",
        currency: "EUR",
    },
    {
        id: "INV-008",
        propertyName: "Desert Villa",
        propertyAddress: "Desierto Tabernas s/n, Almeria",
        amount: 3200,
        date: new Date("2026-01-28"),
        period: "January 2026",
        status: "paid",
        description: "Monthly rental - January 2026",
        category: "rental",
        paymentMethod: "Credit Card",
        invoiceNumber: "INV-2026-0007",
        currency: "EUR",
    },
    {
        id: "INV-009",
        propertyName: "Forest Retreat",
        propertyAddress: "Bosque Verde 33, Extremadura",
        amount: 950,
        date: new Date("2026-01-20"),
        period: "January 2026",
        status: "paid",
        description: "Pool maintenance service",
        category: "service",
        paymentMethod: "Debit Card",
        invoiceNumber: "INV-2026-0008",
        currency: "EUR",
    },
    {
        id: "INV-010",
        propertyName: "Coastal Cottage",
        propertyAddress: "Playa Torremolinos 15, Malaga",
        amount: 780,
        date: new Date("2026-01-15"),
        period: "January 2026",
        status: "overdue",
        description: "Monthly rental - January 2026",
        category: "rental",
        paymentMethod: "Bank Transfer",
        invoiceNumber: "INV-2026-0009",
        currency: "EUR",
    },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export interface Service {
    id: string;
    name: string;
    propertyName: string;
    status: "active" | "expired";
    nextPayment: string;
}

export const mockServices: Service[] = [
    { id: "SVC-001", name: "Internet Premium", propertyName: "Villa Sunset", status: "active", nextPayment: "Apr 1, 2026" },
    { id: "SVC-002", name: "Pool Cleaning", propertyName: "Beach House", status: "active", nextPayment: "Apr 5, 2026" },
    { id: "SVC-003", name: "Security System", propertyName: "Penthouse City", status: "active", nextPayment: "Apr 10, 2026" },
    { id: "SVC-004", name: "Lawn Maintenance", propertyName: "Mountain Cabin", status: "expired", nextPayment: "N/A" },
    { id: "SVC-005", name: "Electricity Plan", propertyName: "City Apartment", status: "active", nextPayment: "Apr 15, 2026" },
    { id: "SVC-006", name: "Gas Contract", propertyName: "Lake House", status: "expired", nextPayment: "N/A" },
    { id: "SVC-007", name: "Cleaning Service", propertyName: "Desert Villa", status: "active", nextPayment: "Apr 18, 2026" },
    { id: "SVC-008", name: "Smart Home", propertyName: "Forest Retreat", status: "active", nextPayment: "Apr 20, 2026" },
];

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType = "reservation" | "invoice" | "service" | "general";

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
    type: NotificationType;
    relatedId?: string;
}

export const mockNotifications: Notification[] = [
    { id: "NOT-001", title: "Payment received", message: "Your payment of $1,250 for Villa Sunset has been confirmed.", date: "Mar 15, 2026", read: true, type: "invoice", relatedId: "INV-001" },
    { id: "NOT-002", title: "Invoice overdue", message: "Invoice INV-2026-0011 for $180 is past due. Please make payment.", date: "Apr 2, 2026", read: false, type: "invoice", relatedId: "INV-004" },
    { id: "NOT-003", title: "New reservation", message: "Your reservation for Ocean View Villa from Jul 1 to Jul 7 is confirmed.", date: "Feb 28, 2026", read: true, type: "reservation", relatedId: "res-001" },
    { id: "NOT-004", title: "Service renewal", message: "Your Internet Premium plan at Villa Sunset renews on Apr 1.", date: "Mar 25, 2026", read: false, type: "service", relatedId: "SVC-001" },
    { id: "NOT-005", title: "Maintenance scheduled", message: "Pool cleaning has been scheduled for Beach House on Apr 5.", date: "Mar 30, 2026", read: true, type: "service", relatedId: "SVC-002" },
    { id: "NOT-006", title: "Password changed", message: "Your account password was successfully updated.", date: "Mar 10, 2026", read: true, type: "general" },
    { id: "NOT-007", title: "New invoice", message: "Invoice INV-2026-0002 for $950 has been generated for Penthouse City.", date: "Mar 10, 2026", read: false, type: "invoice", relatedId: "INV-002" },
];

