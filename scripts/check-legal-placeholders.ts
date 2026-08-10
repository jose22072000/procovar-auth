/**
 * Reports the state of the published legal data:
 *   · PENDIENTE  — no value; the page shows a placeholder. Blocks publication (exit 1).
 *   · POR CONFIRMAR — a real value is published but was inferred or proposed.
 *
 * Run with:  npx tsx scripts/check-legal-placeholders.ts
 */
import { COMPANY, PENDING, pendingCompanyFields, unconfirmedValues } from "../src/lib/legal/company";
import { LEGAL_DOCS } from "../src/app/legal/_content";

const pendingFields = pendingCompanyFields();
const unconfirmed = unconfirmedValues();

if (pendingFields.length === 0) {
    console.log("✅ Sin datos pendientes: todos los campos legales tienen valor.");
} else {
    console.log(`⛔ ${pendingFields.length} dato(s) PENDIENTE(S) en src/lib/legal/company.ts — bloquean la publicación:\n`);
    for (const field of pendingFields) {
        console.log(`  · ${field}: ${COMPANY[field as keyof typeof COMPANY]}`);
    }
}

if (unconfirmed.length > 0) {
    console.log(`\n⚠️  ${unconfirmed.length} valor(es) publicados POR CONFIRMAR:\n`);
    for (const { value, why } of unconfirmed) {
        console.log(`  · "${value}" → ${why}`);
    }
}

const docsWithPending = LEGAL_DOCS.filter((doc) => doc.body.includes(PENDING));
if (docsWithPending.length > 0) {
    console.log(`\nDocumentos que muestran un placeholder al usuario: ${docsWithPending.map((d) => d.slug).join(", ")}`);
}

process.exit(pendingFields.length === 0 ? 0 : 1);
