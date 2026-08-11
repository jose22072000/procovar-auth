import { NavBarBasic } from "@/components/layout/navbar";

// Páginas de una persona concreta: nunca se generan por adelantado.
export const dynamic = "force-dynamic";

/**
 * El armazón de todo lo que hay dentro de la sesión.
 *
 * Antes buscaba en la base las direcciones de la web de reservas y del panel del
 * producto del que salió este código, para poner dos enlaces en la barra. Esas
 * dos aplicaciones no existen en Procovar, así que eran dos consultas a la base
 * en cada carga para acabar apuntando a `hostravel.net`.
 */
export default async function UserLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="min-h-svh bg-pv-papel">
            <NavBarBasic />
            {/* El hueco de arriba es exactamente el alto de la barra fija. */}
            <main className="pt-14">{children}</main>
        </div>
    );
}
