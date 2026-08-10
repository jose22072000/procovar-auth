/**
 * Single source of truth for the legal identity published across the site
 * (footer, legal pages, checkout consent text).
 *
 * Two markers are used, and `scripts/check-legal-placeholders.ts` reports both:
 *  · PENDING — no value yet. The page shows the marker: MUST be filled before publishing.
 *  · CONFIRM — a value IS published, but it was taken from a secondary source or
 *    is a proposed default. The page renders normally; the owner has to confirm it.
 *
 * See docs/legal/DATOS-PENDIENTES.md for where each value comes from.
 */

/** Marker for a value the owner still has to provide (blocks publication). */
export const PENDING = "«PENDIENTE»" as const;

/** Wraps a published-but-unconfirmed value so the checker can list it. */
function confirm<T extends string>(value: T, why: string): T {
    // The marker lives in a side list, never inside the rendered string, so the
    // user-facing text stays clean while the checker can still flag the value.
    // A list (not a map keyed by value) so two fields sharing the same text —
    // e.g. two providers both located in "Unión Europea" — are both reported.
    UNCONFIRMED.push({ value, why });
    return value;
}
const UNCONFIRMED: Array<{ value: string; why: string }> = [];

export const COMPANY = {
    /** Trade name shown to users. */
    brand: "HOSTRAVEL",
    /** Registered company name (razón social). Source: Registro Mercantil. */
    legalName: "Explotaciones Hosteleras Infantas, S.L.",
    /** CIF / NIF. */
    taxId: "B-88590989",
    addressLine: "Calle de las Palmas 44, 1.º B",
    postalCode: "28938",
    city: "Móstoles",
    province: "Madrid",
    country: "España",
    /**
     * Registro Mercantil data — art. 10 LSSI requires it for companies.
     * Taken from public company registries (datoscif / empresia), which agree on
     * tomo/sección/hoja but differ on the folio (90 at incorporation, 92 at the
     * latest entry). Confirm against a nota simple before publishing.
     */
    registryData: confirm(
        "Registro Mercantil de Madrid, Tomo 40.246, Folio 92, Sección 8, Hoja M-715053",
        "verificar con nota simple del Registro Mercantil (folio 90 vs 92 según fuente)",
    ),
    /**
     * Customer-service email. MUST be a real, monitored mailbox (art. 10 LSSI).
     * hostravel.com's MX points at mail.divergtech.com, so the mailbox has to
     * exist there. `noreply@` / `dokploy@` (today's env values) are NOT valid as
     * a public contact address.
     */
    supportEmail: confirm("reservas@hostravel.com", "crear/confirmar el buzón real en mail.divergtech.com"),
    /** Privacy / data-protection requests inbox. */
    privacyEmail: confirm("privacidad@hostravel.com", "crear/confirmar el buzón real; puede redirigir a soporte"),
    /** Data Protection Officer contact, or a statement that none is required. */
    dpoContact: confirm(
        "No resulta obligatorio designar Delegado de Protección de Datos conforme al art. 37 RGPD",
        "confirmar con asesoría: obligatorio si hay tratamiento a gran escala u observación sistemática",
    ),
    phone: "+34 919 540 882",
    /** WhatsApp support line published on the booking site. */
    whatsapp: confirm("+34 613 415 444", "confirmar que sigue operativo"),
    /** Descriptor the card statement will show — provided by the acquirer. */
    cardDescriptor: `${PENDING}: descriptor de comercio facilitado por la entidad adquirente`,
    /** Public booking portal. */
    bookingDomain: "hostravel.com",
    /** Account center + checkout (this app). */
    accountDomain: "account.hostravel.com",
    /** Owner/organization management panel. Owner-confirmed; live (title "HTPanel"). */
    panelDomain: "extranet.hostravel.com",
    /** Deadline we commit to for ORDERING a refund at the gateway. */
    refundOrderDeadline: confirm("5 días hábiles", "plazo propuesto: debe ser el que la operativa real cumpla"),
    /** Deadline for resolving cancellations under case-by-case rate rules. */
    customPolicyReviewDeadline: confirm("10 días hábiles", "plazo propuesto"),
    /** Commission / subscription model agreed with organizations. */
    orgEconomicModel: `${PENDING}: modelo económico con organizaciones (comisión por reserva, tarifa fija o suscripción)`,
    /** Notice period either party must give to end the organization contract. */
    orgTerminationNotice: confirm("30 días", "preaviso propuesto"),
    /** Effective date printed on every legal document. */
    effectiveDate: confirm("6 de agosto de 2026", "fecha propuesta: ajustar al día real de publicación"),
    /** Version stamped on the consent record stored with each booking. */
    termsVersion: "1.0",
} as const;

/**
 * Third parties that process personal data on our behalf or receive it to run
 * the service. Published in the privacy policy — art. 13.1.e RGPD.
 */
export const PROCESSORS = [
    {
        name: "Redsys Servicios de Procesamiento, S.L. y la entidad adquirente",
        role: "Procesamiento de pagos con tarjeta, autenticación 3D Secure y tokenización",
        location: "España (UE)",
    },
    {
        name: "Divergtech",
        role: "Proveedor tecnológico: infraestructura de la plataforma, correo transaccional (mail.divergtech.com) y servicio de notificaciones",
        location: confirm("Unión Europea", "confirmar proveedor de hosting/VPS y país de los servidores"),
    },
    {
        name: "Cloudflare, Inc.",
        role: "Red de distribución de contenido, protección frente a ataques y filtrado de tráfico",
        location: "EE. UU. con cláusulas contractuales tipo (art. 46 RGPD)",
    },
    {
        name: "FNSrooms (FNS Manager / FNS Booking)",
        role: "Sistema de gestión hotelera y channel manager de los alojamientos: recepción y sincronización de reservas",
        location: confirm("Unión Europea", "confirmar razón social exacta y ubicación del proveedor PMS"),
    },
] as const;

export const COMPANY_ADDRESS = `${COMPANY.addressLine} — ${COMPANY.postalCode} ${COMPANY.city} (${COMPANY.province}), ${COMPANY.country}`;

/** True when a resolved string still carries an unfilled placeholder. */
export function isPending(value: string): boolean {
    return value.includes(PENDING);
}

/** Every COMPANY entry that still needs a real value (blocks publication). */
export function pendingCompanyFields(): string[] {
    return Object.entries(COMPANY)
        .filter(([, value]) => typeof value === "string" && isPending(value))
        .map(([key]) => key);
}

/** Published values that were inferred/proposed and need owner confirmation. */
export function unconfirmedValues(): Array<{ value: string; why: string }> {
    return [...UNCONFIRMED];
}
