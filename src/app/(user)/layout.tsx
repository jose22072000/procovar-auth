import { NavBarBasic } from "@/components/layout/navbar";
import { prisma } from "@/lib/prisma";

// Authenticated, per-user pages — never statically prerendered. Without this,
// `next build` tries to prerender the profile routes, runs this async layout,
// and hits the DB (clientApp.findFirst) at build time where no DB exists,
// failing with ECONNREFUSED. Force dynamic so the query runs at request time.
export const dynamic = "force-dynamic";

function extractOrigin(callbackUrls: string[], fallback: string): string {
    for (const url of callbackUrls) {
        try {
            const u = new URL(url);
            if (u.hostname !== "localhost" && !u.hostname.startsWith("127.")) {
                return u.origin;
            }
        } catch {}
    }
    return fallback;
}

export default async function UserLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    let bookingUrl = (process.env.QB_BOOKING_URL);
    let panelUrl = process.env.QB_PANEL_URL;

    if (!bookingUrl || !panelUrl) {
        const [bookingApp, panelApp] = await Promise.all([
            !bookingUrl
                ? prisma.clientApp.findFirst({
                      where: { clientId: "qb-booking", active: true },
                      select: { allowedCallbackUrls: true },
                  })
                : null,
            !panelUrl
                ? prisma.clientApp.findFirst({
                      where: { clientId: "qb-panel", active: true },
                      select: { allowedCallbackUrls: true },
                  })
                : null,
        ]);
        if (!bookingUrl) {
            bookingUrl = extractOrigin(
                bookingApp?.allowedCallbackUrls ?? [],
                "https://hostravel.net"
            );
        }
        if (!panelUrl) {
            panelUrl = extractOrigin(
                panelApp?.allowedCallbackUrls ?? [],
                "https://panel.hostravel.net"
            );
        }
    }

    return (
        <div className="radial-bg min-h-svh">
            <NavBarBasic bookingUrl={bookingUrl} panelUrl={panelUrl} />
            <main className="pt-20 md:pt-24">{children}</main>
        </div>
    );
}
