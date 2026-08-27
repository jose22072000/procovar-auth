import Link from "next/link";
import { Icon } from "@iconify/react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { ProfileRole } from "@/lib/role-resolver";

interface AccountViewProps {
    user: { id: string; name: string; email: string; image?: string | null; isSystemAdmin?: boolean };
    role: ProfileRole;
}

/**
 * Lo primero que ve alguien que ya tiene la sesión abierta.
 *
 * Antes era una tarjeta con una cabecera en degradado morado y un "bienvenido de
 * nuevo" enorme, y debajo tres botones de los que dos ya no llevaban a ninguna
 * parte —"dashboard propietario", "mi perfil personal"— porque eran del producto
 * del que salió este código.
 *
 * Ahora responde la única pregunta que trae quien llega aquí: **a dónde voy**.
 * Se enseñan las aplicaciones a las que esta persona puede entrar, y su sucursal
 * arriba, porque de eso depende lo que verá cuando llegue.
 *
 * No hay saludo. Se entra a trabajar, no de visita.
 */

interface Destino {
    href: string;
    icono: string;
    titulo: string;
    descripcion: string;
    externo?: boolean;
}

/**
 * Todo el ecosistema, no sólo las cuatro de siempre.
 *
 * Faltaban cinco de las nueve —Rutas, Entrega, Caja, Traslado y el Portal—, así que
 * quien entraba aquí veía media plataforma y tenía que saberse las direcciones de
 * memoria para llegar al resto. Comprobadas una a una antes de ponerlas: todas responden.
 *
 * n8n se queda fuera a propósito. Es la herramienta de automatizaciones, no una
 * aplicación de negocio: quien la necesita sabe dónde está, y ponerla aquí invita a
 * entrar a quien no tiene por qué.
 */
const APLICACIONES: Destino[] = [
    {
        href: "https://pedidos.procovar.cloud",
        icono: "lucide:clipboard-list",
        titulo: "PEDIDO",
        descripcion: "Pedidos, clientes y vendedores.",
        externo: true,
    },
    {
        href: "https://analitics.procovar.cloud",
        icono: "lucide:bar-chart-3",
        titulo: "Analitics",
        descripcion: "Informes de ventas, gestores y productos.",
        externo: true,
    },
    {
        href: "https://rutas.procovar.cloud",
        icono: "lucide:route",
        titulo: "Rutas",
        descripcion: "Recorridos de los vendedores sobre el mapa.",
        externo: true,
    },
    {
        href: "https://delivery.procovar.cloud",
        icono: "lucide:truck",
        titulo: "Delivery",
        descripcion: "Reparto y planificación de rutas.",
        externo: true,
    },
    {
        href: "https://entrega.procovar.cloud",
        icono: "lucide:package-check",
        titulo: "Entrega",
        descripcion: "Panel de la aplicación de los repartidores.",
        externo: true,
    },
    {
        href: "https://caja.procovar.cloud",
        icono: "lucide:banknote",
        titulo: "Caja",
        descripcion: "Cobros y cierres de caja.",
        externo: true,
    },
    {
        href: "https://traslado.procovar.cloud",
        icono: "lucide:arrow-left-right",
        titulo: "Traslado",
        descripcion: "Movimientos de mercancía entre sucursales.",
        externo: true,
    },
    {
        href: "https://ccsa.procovar.cloud",
        icono: "lucide:layout-dashboard",
        titulo: "Tablero Parranda",
        descripcion: "El tablero de Parranda / CCSA.",
        externo: true,
    },
    {
        href: "https://procovar.cloud",
        icono: "lucide:home",
        titulo: "Portal",
        descripcion: "La entrada común a todo lo demás.",
        externo: true,
    },
];


export async function AccountView({ user, role }: AccountViewProps) {
    const t = await getTranslations();

    const miembros = await prisma.member.findMany({
        where: { userId: user.id },
        select: { organization: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
    });

    // El alcance, arriba y siempre: de él depende lo que se verá al llegar a
    // cualquiera de las aplicaciones.
    const alcance = user.isSystemAdmin
        ? { codigo: "TODAS", nombre: t("cuenta.todasLasSucursales") }
        : miembros[0]
          ? { codigo: miembros[0].organization.slug.toUpperCase(), nombre: miembros[0].organization.name }
          : null;

    const gestion: Destino[] = [];
    if (user.isSystemAdmin) {
        gestion.push({
            href: "/dashboard/organizations",
            icono: "lucide:building-2",
            titulo: t("cuenta.panel"),
            descripcion: t("cuenta.panelDesc"),
        });
    } else if (role === "org-full") {
        gestion.push({
            href: "/profile/org",
            icono: "lucide:building-2",
            titulo: t("orgPage.title"),
            descripcion: t("cuenta.miSucursalDesc"),
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="pv-rotulo">{t("cuenta.rotulo")}</p>
                    <h1 className="pv-titulo mt-1 text-2xl">{user.name}</h1>
                    <p className="mt-0.5 text-sm text-pv-tinta-suave">{user.email}</p>
                </div>

                {alcance && (
                    <span className="pv-marco">
                        <span className="pv-rotulo">{t("cuenta.alcance")}</span>
                        <span className="pv-codigo font-semibold text-pv-azul">{alcance.codigo}</span>
                    </span>
                )}
            </div>

            <div>
                <h2 className="pv-rotulo mb-2">{t("cuenta.aplicaciones")}</h2>
                <div className="grid gap-px bg-pv-trazo-tenue sm:grid-cols-2 lg:grid-cols-3">
                    {[...gestion, ...APLICACIONES].map((d) => (
                        <Link
                            key={d.href}
                            href={d.href}
                            target={d.externo ? "_blank" : undefined}
                            rel={d.externo ? "noopener noreferrer" : undefined}
                            className="group flex items-start gap-3 bg-pv-blanco p-4 transition-colors hover:bg-pv-azul-tinte"
                        >
                            <Icon
                                icon={d.icono}
                                className="mt-0.5 size-5 shrink-0 text-pv-tinta-suave transition-colors group-hover:text-pv-azul"
                                aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                    <span className="font-semibold">{d.titulo}</span>
                                    {d.externo && (
                                        <Icon
                                            icon="lucide:arrow-up-right"
                                            className="size-3.5 shrink-0 text-pv-tinta-suave"
                                            aria-hidden
                                        />
                                    )}
                                </span>
                                <span className="mt-0.5 block text-sm text-pv-tinta-suave">
                                    {d.descripcion}
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-pv-trazo-tenue pt-4 text-sm">
                <Link href="/profile" className="text-pv-azul hover:underline">
                    {t("nav.profile")}
                </Link>
                <Link href="/profile/me" className="text-pv-azul hover:underline">
                    {t("nav.settings")}
                </Link>
                <Link href="/logout" className="ml-auto text-pv-cuno hover:underline">
                    {t("nav.logOut")}
                </Link>
            </div>
        </div>
    );
}
