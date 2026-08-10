import Link from "next/link";
import { LEGAL_DOCS } from "@/app/legal/_content";
import { COMPANY, COMPANY_ADDRESS } from "@/lib/legal/company";

/**
 * Global footer. Rendered by the root layout so EVERY page — including the
 * checkout — identifies the merchant and links to the legal corpus one click
 * away, which is what the acquiring bank checks before enabling the virtual
 * POS (and what art. 10 LSSI requires).
 */
export function SiteFooter() {
    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="grid gap-6 text-xs text-gray-600 md:grid-cols-3">
                    <div>
                        <p className="mb-2 text-sm font-bold text-gray-900">{COMPANY.brand}</p>
                        <p>{COMPANY.legalName}</p>
                        <p>C.I.F. {COMPANY.taxId}</p>
                        <p>{COMPANY_ADDRESS}</p>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-gray-900">Atención al cliente</p>
                        <p>{COMPANY.supportEmail}</p>
                        <p>{COMPANY.phone}</p>
                        <p className="mt-2">
                            Pagos con tarjeta procesados por <strong className="font-semibold">Redsys</strong> · Visa ·
                            Mastercard · 3D Secure
                        </p>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-gray-900">Información legal</p>
                        <ul className="space-y-1">
                            {LEGAL_DOCS.map((doc) => (
                                <li key={doc.slug}>
                                    <Link href={`/legal/${doc.slug}`} className="underline underline-offset-2 hover:text-gray-900">
                                        {doc.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <p className="mt-6 border-t border-gray-100 pt-4 text-[11px] text-gray-500">
                    © {new Date().getFullYear()} {COMPANY.legalName}. Todos los derechos reservados. Precios en euros (EUR),
                    impuestos incluidos salvo indicación en contrario.
                </p>
            </div>
        </footer>
    );
}
