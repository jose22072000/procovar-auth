import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { prisma } from "@/lib/prisma";
import { MiPerfilClient } from "@/components/profile/personal/mi-perfil-client";

function extractOrigin(urls: string[], fallback: string): string {
    for (const url of urls) {
        try {
            const u = new URL(url);
            if (u.hostname !== "localhost" && !u.hostname.startsWith("127.")) return u.origin;
        } catch {}
    }
    return fallback;
}

export default async function MiPerfilPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    // Note: unlike the removed /profile/config, admins are NOT redirected away —
    // this is their own personal profile.
    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
    });
    const isOrgUser = role === "org-full" || role === "org-restricted";

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
        if (!bookingUrl)
            bookingUrl = extractOrigin(bookingApp?.allowedCallbackUrls ?? [], "https://hostravel.net");
        if (!panelUrl)
            panelUrl = extractOrigin(panelApp?.allowedCallbackUrls ?? [], "https://panel.hostravel.net");
    }

    return <MiPerfilClient isOrgUser={isOrgUser} bookingUrl={bookingUrl} panelUrl={panelUrl} />;
}
