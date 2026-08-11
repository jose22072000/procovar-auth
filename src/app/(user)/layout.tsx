import { NavBarBasic } from "@/components/layout/navbar";
import { getCurrentUser } from "@/server/auth.server";

// Páginas de una persona concreta: nunca se generan por adelantado.
export const dynamic = "force-dynamic";

/**
 * El armazón de lo que hay dentro de la sesión.
 *
 * **Sin sesión no hay barra.** La de arriba es el menú de la persona y el
 * selector de idioma: con la sesión cerrada no tiene a quién enseñar ni adónde
 * llevar, y encima le comía el borde a la pantalla de entrada, que va a sangre.
 *
 * Tampoco hay pie. El que había identificaba a la empresa y enlazaba los
 * documentos legales, que es lo que necesita una web que vende a desconocidos.
 * Esto es la herramienta de casa: quien entra ya sabe dónde trabaja.
 */
export default async function UserLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { data: user } = await getCurrentUser();

    if (!user) return <>{children}</>;

    return (
        <div className="min-h-svh bg-pv-papel">
            <NavBarBasic />
            {/* El hueco de arriba es exactamente el alto de la barra fija. */}
            <main className="pt-14">{children}</main>
        </div>
    );
}
