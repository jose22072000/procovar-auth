import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, getLegalDoc } from "../_content";
import { Markdown } from "../_lib/markdown";
import { COMPANY } from "@/lib/legal/company";

export function generateStaticParams() {
    return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const doc = getLegalDoc(slug);
    if (!doc) return { title: `Información legal | ${COMPANY.brand}` };
    return { title: `${doc.title} | ${COMPANY.brand}`, description: doc.summary };
}

export default async function LegalDocPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const doc = getLegalDoc(slug);
    if (!doc) notFound();

    return (
        <article className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
            <nav className="mb-4 text-xs">
                <Link href="/legal" className="underline underline-offset-2" style={{ color: "#1e3a8a" }}>
                    ← Información legal
                </Link>
            </nav>

            <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
            <p className="mt-1 text-xs text-gray-500">
                {COMPANY.legalName} · C.I.F. {COMPANY.taxId} — Versión {COMPANY.termsVersion} · en vigor desde{" "}
                {COMPANY.effectiveDate}
            </p>

            <div className="mt-6">
                <Markdown source={doc.body} />
            </div>
        </article>
    );
}
