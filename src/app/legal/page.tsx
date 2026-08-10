import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_DOCS } from "./_content";
import { COMPANY, COMPANY_ADDRESS } from "@/lib/legal/company";

export const metadata: Metadata = {
    title: `Información legal | ${COMPANY.brand}`,
    description: `Aviso legal, condiciones de contratación, política de pagos, cancelaciones, privacidad y cookies de ${COMPANY.brand}.`,
};

export default function LegalIndexPage() {
    return (
        <>
            <h1 className="text-xl font-bold text-gray-900">Información legal</h1>
            <p className="mt-2 text-sm text-gray-600">
                Documentos que regulan el uso de la plataforma, la contratación de reservas y el tratamiento de los datos
                personales. Versión {COMPANY.termsVersion} · en vigor desde {COMPANY.effectiveDate}.
            </p>

            <ul className="mt-6 space-y-3">
                {LEGAL_DOCS.map((doc) => (
                    <li key={doc.slug}>
                        <Link
                            href={`/legal/${doc.slug}`}
                            className="block rounded-sm border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300"
                        >
                            <span className="text-sm font-semibold" style={{ color: "#1e3a8a" }}>
                                {doc.title}
                            </span>
                            <span className="mt-1 block text-xs text-gray-600">{doc.summary}</span>
                        </Link>
                    </li>
                ))}
            </ul>

            <section className="mt-8 rounded-sm border border-gray-200 bg-white p-4 text-xs text-gray-600">
                <h2 className="mb-2 text-sm font-semibold text-gray-900">Titular</h2>
                <p>{COMPANY.legalName} · C.I.F. {COMPANY.taxId}</p>
                <p>{COMPANY_ADDRESS}</p>
                <p>
                    {COMPANY.supportEmail} · {COMPANY.phone}
                </p>
            </section>
        </>
    );
}
