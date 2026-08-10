import { COMPANY } from "@/lib/legal/company";
import { avisoLegal } from "./aviso-legal";
import { condiciones } from "./condiciones";
import { privacidad } from "./privacidad";
import { cookies } from "./cookies";
import { pagos } from "./pagos";
import { cancelaciones } from "./cancelaciones";
import { organizaciones } from "./organizaciones";

export interface LegalDoc {
    /** URL segment under /legal. */
    slug: string;
    /** Page + link title. */
    title: string;
    /** One-line description shown in the /legal index and as meta description. */
    summary: string;
    /** Markdown body (see ../_lib/markdown.tsx for the supported subset). */
    body: string;
}

/**
 * The published legal corpus. Order here is the order shown in /legal and in
 * the footer.
 */
export const LEGAL_DOCS: LegalDoc[] = [
    {
        slug: "aviso-legal",
        title: "Aviso Legal",
        summary: `Identificación de ${COMPANY.legalName}, condiciones de uso del sitio y jurisdicción aplicable.`,
        body: avisoLegal,
    },
    {
        slug: "condiciones",
        title: "Condiciones Generales de Contratación",
        summary: "Cómo se contrata una reserva: proceso, precios, pagos, descuentos, cancelación y responsabilidad.",
        body: condiciones,
    },
    {
        slug: "pagos",
        title: "Política de Pagos y Seguridad",
        summary: "Medios de pago, procesamiento con Redsys, autenticación 3D Secure, tarjetas guardadas y reembolsos.",
        body: pagos,
    },
    {
        slug: "cancelaciones",
        title: "Política de Cancelaciones y Reembolsos",
        summary: "Tipos de política de cancelación, cargos por cancelación tardía, procedimiento y plazos de reembolso.",
        body: cancelaciones,
    },
    {
        slug: "privacidad",
        title: "Política de Privacidad",
        summary: "Qué datos tratamos, con qué finalidad y base jurídica, a quién se comunican y cómo ejercer sus derechos.",
        body: privacidad,
    },
    {
        slug: "cookies",
        title: "Política de Cookies",
        summary: "Cookies técnicas utilizadas en el centro de cuenta y pago, y cómo gestionarlas.",
        body: cookies,
    },
    {
        slug: "organizaciones",
        title: "Condiciones para Organizaciones y Propietarios",
        summary: "Panel de gestión, miembros y permisos, API, comisiones, liquidaciones y obligaciones del alojamiento.",
        body: organizaciones,
    },
];

export function getLegalDoc(slug: string): LegalDoc | undefined {
    return LEGAL_DOCS.find((doc) => doc.slug === slug);
}
