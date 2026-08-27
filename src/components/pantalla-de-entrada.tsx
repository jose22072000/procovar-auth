import Image from "next/image";
import { Icon } from "@iconify/react";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/forms/sign-in";

/**
 * La entrada a Procovar.
 *
 * Es la primera pantalla que ve todo el mundo y la única que ven quienes aún no
 * han entrado, así que es la que dice qué clase de sitio es esto. La anterior
 * era una tarjeta centrada con un emoji saludando y un "bienvenido de nuevo":
 * la plantilla que trae cualquier producto, y venía tal cual del que salió este
 * código.
 *
 * Esta parte en dos. A la izquierda, en el azul del isotipo, la marca y para qué
 * sirve: se entra una vez y se entra en todas. A la derecha, sobre papel, el
 * formulario y nada más.
 *
 * Dos cosas que no están y es a propósito:
 *
 * · **No hay registro.** Las cuentas las da de alta un administrador dentro de
 *   una sucursal. Alguien que se registre solo no pertenece a ninguna, así que
 *   entraría a una pantalla vacía sin entender por qué.
 * · **No hay iconos de adorno.** Los que hay señalan una aplicación concreta.
 *
 * En móvil la columna azul se recoge a una banda de cabecera: ocupar media
 * pantalla con la marca en un teléfono es dejar el formulario debajo del pliegue.
 */

/**
 * Las aplicaciones que se anuncian en la portada, antes de entrar.
 *
 * Es una lista APARTE de la del panel (account-view.tsx), y por eso se quedó con cuatro
 * cuando la otra se completó: dos sitios con la misma lista y sólo uno actualizado. Se
 * queda separada a propósito —aquí sólo son nombres, sin enlaces ni permisos— pero si se
 * añade una aplicación hay que tocar las dos.
 */
const APLICACIONES = [
    { icono: "lucide:clipboard-list", nombre: "PEDIDO" },
    { icono: "lucide:bar-chart-3", nombre: "Analitics" },
    { icono: "lucide:route", nombre: "Rutas" },
    { icono: "lucide:truck", nombre: "Delivery" },
    { icono: "lucide:package-check", nombre: "Entrega" },
    { icono: "lucide:banknote", nombre: "Caja" },
    { icono: "lucide:arrow-left-right", nombre: "Traslado" },
    { icono: "lucide:layout-dashboard", nombre: "Parranda" },
];

export async function PantallaDeEntrada({ savedEmail }: { savedEmail?: string }) {
    const t = await getTranslations();

    return (
        <div className="grid min-h-svh lg:grid-cols-[minmax(0,42%)_1fr]">
            {/* La marca */}
            <aside className="relative flex flex-col justify-between overflow-hidden bg-pv-azul-hondo px-6 py-8 lg:px-12 lg:py-14">
                {/* El corchete abierto del isotipo, en grande y muy tenue. Es el
                    único adorno de la pantalla, y es la propia marca. */}
                <span
                    aria-hidden
                    className="pointer-events-none absolute -right-16 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 border-y-2 border-l-2 border-white/[0.07] lg:block"
                />

                <div className="relative">
                    <Image
                        src="/logo.png"
                        alt="Procovar"
                        width={196}
                        height={40}
                        className="h-7 w-auto object-contain lg:h-9"
                        priority
                    />
                </div>

                <div className="relative mt-8 lg:mt-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
                        {t("navbar.section")}
                    </p>
                    <h1 className="mt-2 max-w-md text-2xl font-bold leading-tight text-white lg:text-4xl">
                        {t("entrada.titulo")}
                    </h1>
                    <p className="mt-3 max-w-sm text-sm text-white/60">{t("entrada.explicacion")}</p>

                    <ul className="mt-7 hidden flex-wrap gap-x-6 gap-y-3 lg:flex">
                        {APLICACIONES.map((a) => (
                            <li key={a.nombre} className="flex items-center gap-2 text-sm text-white/70">
                                <Icon icon={a.icono} className="size-4 shrink-0 text-white/40" aria-hidden />
                                {a.nombre}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative mt-8 hidden text-xs text-white/35 lg:block">
                    {t("entrada.pie")}
                </p>
            </aside>

            {/* El formulario */}
            <main className="flex items-center justify-center bg-pv-papel px-6 py-10 lg:px-12">
                <div className="w-full max-w-sm">
                    <p className="pv-rotulo">{t("entrada.rotuloFormulario")}</p>
                    <h2 className="pv-titulo mt-1 text-2xl">{t("auth.signIn")}</h2>

                    <div className="mt-7">
                        <SignInForm savedEmail={savedEmail} />
                    </div>

                    <p className="mt-7 border-t border-pv-trazo-tenue pt-5 text-sm text-pv-tinta-suave">
                        {t("entrada.sinCuenta")}
                    </p>
                </div>
            </main>
        </div>
    );
}
