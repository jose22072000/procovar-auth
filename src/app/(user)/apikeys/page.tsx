import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth.server";
import { prisma } from "@/lib/prisma";
import { ApiKeysManager } from "@/components/apikeys-manager";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

/**
 * Aplicaciones: todo lo que necesita una aplicación para usar este login.
 *
 * Estaba repartido en dos pantallas —el alta de aplicaciones en "Ajustes" y sus
 * claves aquí— cuando es la misma tarea: conectar PEDIDO, Analitics, Delivery o
 * el tablero. Dar de alta una aplicación en un sitio y su clave en otro es la
 * clase de reparto que hace que alguien deje una a medias.
 *
 * "Ajustes" desapareció con esto: lo único suyo que quedaba era un campo de
 * "minutos para completar la reserva antes de que expire", del negocio de
 * alojamientos del que salió este código.
 *
 * Solo para el Super Admin. Dar de alta una aplicación es entregarle una llave
 * del sistema entero, y eso no se delega por sucursal.
 */
export default async function AplicacionesPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    const t = await getTranslations();

    if (!user.isSystemAdmin) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-16">
                <p className="pv-rotulo">{t("rail.aplicaciones")}</p>
                <h1 className="pv-titulo mt-1 text-2xl">{t("apiKeys.page.accessDeniedTitle")}</h1>
                <p className="mt-2 text-sm text-pv-tinta-suave">{t("apiKeys.page.accessDeniedBody")}</p>
            </div>
        );
    }

    const aplicacionesRaw = await prisma.clientApp.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true, clientId: true, name: true, description: true,
            allowedCallbackUrls: true, allowedDomains: true, scopes: true,
            signingKeyVersion: true, active: true, createdAt: true, updatedAt: true,
        },
    });

    const aplicaciones = aplicacionesRaw.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }));

    return (
        <div className="mx-auto max-w-7xl space-y-7 px-4 py-6">
            <div>
                <p className="pv-rotulo">{t("rail.aplicaciones")}</p>
                <h1 className="pv-titulo mt-1 text-2xl">{t("apiKeys.page.title")}</h1>
                <p className="mt-1 max-w-2xl text-sm text-pv-tinta-suave">
                    {t("apiKeys.page.subtitle")}
                </p>
            </div>

            {/* Primero las aplicaciones: darlas de alta es el paso que hay que
                dar para conectar PEDIDO o Analitics. Las claves van después,
                porque son de una aplicación concreta. */}
            <AdminDashboard initialClients={aplicaciones} />

            <ApiKeysManager />
        </div>
    );
}
