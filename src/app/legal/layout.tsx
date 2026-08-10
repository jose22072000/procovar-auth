import Link from "next/link";
import Image from "next/image";
import { COMPANY } from "@/lib/legal/company";

/**
 * Shell for the public legal corpus. Deliberately standalone (no navbar, no
 * DB access, no auth): these pages must render for a logged-out visitor —
 * and for the acquiring bank reviewing the site — under every circumstance.
 */
export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="min-h-svh bg-[#fafafa]">
            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
                    <Link href="/legal" className="flex items-center gap-2">
                        <Image src="/hostravel-icon.png" alt={COMPANY.brand} width={28} height={28} className="h-7 w-7 object-contain" />
                        <span className="text-sm font-bold tracking-wide text-gray-900">{COMPANY.brand}</span>
                    </Link>
                    <span className="text-xs uppercase tracking-wide text-gray-500">Información legal</span>
                </div>
            </header>
            <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </div>
    );
}
