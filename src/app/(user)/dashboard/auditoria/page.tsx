import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditoriaTabla } from "@/components/admin/auditoria-tabla.component";

export const dynamic = "force-dynamic";

/** Cuántos apuntes se traen de una vez. Bastantes para revisar una jornada. */
const POR_PAGINA = 100;

/**
 * Quién hizo qué, desde dónde y cuándo.
 *
 * Se lee de una sola tabla y de un tirón, sin abrir fichas: quien entra aquí
 * está buscando una cosa concreta —cuándo se le quitó el acceso a alguien, quién
 * cambió un permiso— y lo que necesita es recorrer con la vista, no navegar.
 */
export default async function AuditoriaPage({
    searchParams,
}: {
    searchParams: Promise<{ accion?: string; persona?: string; pagina?: string }>;
}) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/");

    // La auditoría es de toda la empresa y enseña movimientos de todas las
    // sucursales, así que la mira quien tiene alcance en todas. Un
    // Administrador ve los suyos desde la ficha de su sucursal, no aquí.
    if (!session.user.isSystemAdmin) redirect("/profile");

    const filtros = await searchParams;
    const pagina = Math.max(1, Number(filtros.pagina) || 1);

    const where = {
        ...(filtros.accion ? { action: filtros.accion } : {}),
        ...(filtros.persona ? { userId: filtros.persona } : {}),
    };

    const [apuntes, total, personas] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: POR_PAGINA,
            skip: (pagina - 1) * POR_PAGINA,
        }),
        prisma.auditLog.count({ where }),
        // Solo quien ha hecho algo alguna vez: un desplegable con las 164
        // personas del sistema no ayuda a nadie.
        prisma.user.findMany({
            where: { id: { in: (await prisma.auditLog.findMany({
                where: { userId: { not: null } },
                select: { userId: true },
                distinct: ["userId"],
                take: 200,
            })).map((a) => a.userId!) } },
            select: { id: true, name: true, email: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const porId = new Map(personas.map((p) => [p.id, p]));

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
            <AuditoriaTabla
                apuntes={apuntes.map((a) => ({
                    id: a.id,
                    action: a.action,
                    resource: a.resource,
                    clientId: a.clientId,
                    ip: a.ip,
                    ua: a.ua,
                    meta: a.meta as Record<string, unknown> | null,
                    createdAt: a.createdAt.toISOString(),
                    quien: a.userId
                        ? { id: a.userId, nombre: porId.get(a.userId)?.name ?? null, email: porId.get(a.userId)?.email ?? null }
                        : null,
                }))}
                personas={personas}
                total={total}
                pagina={pagina}
                porPagina={POR_PAGINA}
                filtros={{ accion: filtros.accion ?? "", persona: filtros.persona ?? "" }}
            />
        </div>
    );
}
