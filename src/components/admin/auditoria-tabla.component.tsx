"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button, Select, SelectItem, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { describirAccion, accionesConocidas } from "@/lib/acciones-auditoria";
import { aplicacionDeSesion, desdeDonde } from "@/lib/desde-donde";

export interface Apunte {
    id: string;
    action: string;
    resource: string | null;
    clientId: string | null;
    ip: string | null;
    ua: string | null;
    meta: Record<string, unknown> | null;
    createdAt: string;
    quien: { id: string; nombre: string | null; email: string | null } | null;
}

const COLOR: Record<string, string> = {
    alta: "pv-etiqueta-visto",
    baja: "pv-etiqueta-cuno",
    cambio: "pv-etiqueta-azul",
    acceso: "pv-etiqueta-gris",
};

/** Cuba va a UTC−4 y el servidor guarda en UTC. Sin esto, un apunte de las 9 de
 *  la noche sale al día siguiente y nadie lo encuentra donde lo busca. */
const ZONA = "America/Havana";

function cuando(iso: string): string {
    return new Date(iso).toLocaleString("es", {
        timeZone: ZONA,
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * El historial de lo que se hace en el sistema.
 *
 * Una fila por apunte y todo a la vista: la frase de lo que pasó, quién lo hizo,
 * desde dónde y cuándo. Los filtros van en la dirección de la página para que
 * una consulta se pueda guardar o mandar por mensaje — "mira, esto es lo que
 * pasó" con un enlace, en vez de explicando qué hay que ir marcando.
 */
export function AuditoriaTabla({
    apuntes,
    personas,
    total,
    pagina,
    porPagina,
    filtros,
}: {
    apuntes: Apunte[];
    personas: { id: string; name: string; email: string }[];
    total: number;
    pagina: number;
    porPagina: number;
    filtros: { accion: string; persona: string };
}) {
    const router = useRouter();
    const params = useSearchParams();
    const paginas = Math.max(1, Math.ceil(total / porPagina));

    function filtrar(clave: string, valor: string) {
        const p = new URLSearchParams(params.toString());
        if (valor) p.set(clave, valor); else p.delete(clave);
        // Al cambiar un filtro se vuelve a la primera página: quedarse en la 7
        // de un resultado que ahora tiene 2 enseña una tabla vacía que parece un
        // "no hay nada".
        p.delete("pagina");
        router.push(`/dashboard/auditoria?${p.toString()}`);
    }

    function irA(n: number) {
        const p = new URLSearchParams(params.toString());
        if (n > 1) p.set("pagina", String(n)); else p.delete("pagina");
        router.push(`/dashboard/auditoria?${p.toString()}`);
    }

    return (
        <>
            <div>
                <p className="pv-rotulo">Accesos</p>
                <h1 className="pv-titulo text-2xl">Auditoría</h1>
                <p className="mt-1 text-sm text-pv-tinta-suave">
                    Todo lo que se hace en los accesos: quién lo hizo, desde dónde y cuándo.
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <Select
                    label="Qué pasó"
                    variant="bordered"
                    size="sm"
                    className="max-w-xs"
                    selectedKeys={filtros.accion ? [filtros.accion] : []}
                    onSelectionChange={(k) => filtrar("accion", String([...k][0] ?? ""))}
                >
                    {accionesConocidas().map((a) => (
                        <SelectItem key={a.clave}>{a.texto}</SelectItem>
                    ))}
                </Select>

                <Select
                    label="Quién"
                    variant="bordered"
                    size="sm"
                    className="max-w-xs"
                    selectedKeys={filtros.persona ? [filtros.persona] : []}
                    onSelectionChange={(k) => filtrar("persona", String([...k][0] ?? ""))}
                >
                    {personas.map((p) => (
                        <SelectItem key={p.id}>{p.name || p.email}</SelectItem>
                    ))}
                </Select>

                {(filtros.accion || filtros.persona) && (
                    <Button
                        size="sm"
                        variant="light"
                        onPress={() => router.push("/dashboard/auditoria")}
                        startContent={<Icon icon="lucide:x" className="size-4" aria-hidden />}
                    >
                        Quitar filtros
                    </Button>
                )}

                <span className="ml-auto text-sm text-pv-tinta-suave">
                    {total.toLocaleString("es")} {total === 1 ? "apunte" : "apuntes"}
                </span>
            </div>

            <div className="pv-ficha overflow-x-auto">
                {apuntes.length === 0 ? (
                    <div className="px-4 py-14 text-center text-sm text-pv-tinta-suave">
                        No hay ningún apunte con esos filtros.
                    </div>
                ) : (
                    <table className="pv-tabla">
                        <thead>
                            <tr>
                                <th>Qué pasó</th>
                                <th>Quién</th>
                                <th>Desde dónde</th>
                                <th>Aplicación</th>
                                <th>Cuándo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apuntes.map((a) => {
                                const { texto, tipo } = describirAccion(a.action);
                                const { ip, aparato } = desdeDonde(a.ip, a.ua);
                                return (
                                    <tr key={a.id}>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span>{texto}</span>
                                                <span className={`pv-etiqueta ${COLOR[tipo]} self-start`}>{a.action}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {a.quien ? (
                                                <div className="leading-tight">
                                                    <div>{a.quien.nombre ?? "—"}</div>
                                                    <div className="text-xs text-pv-tinta-suave">{a.quien.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-pv-tinta-suave">El sistema</span>
                                            )}
                                        </td>
                                        <td>
                                            {!ip && !aparato ? (
                                                <span className="text-pv-tinta-suave">—</span>
                                            ) : (
                                                <div className="leading-tight">
                                                    {ip && <div className="pv-codigo">{ip}</div>}
                                                    {aparato && <div className="text-xs text-pv-tinta-suave">{aparato}</div>}
                                                </div>
                                            )}
                                        </td>
                                        <td>{aplicacionDeSesion(a.clientId)}</td>
                                        <td className="pv-codigo whitespace-nowrap">{cuando(a.createdAt)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {paginas > 1 && (
                <div className="flex items-center justify-between">
                    <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={pagina <= 1}
                        onPress={() => irA(pagina - 1)}
                        startContent={<Icon icon="lucide:chevron-left" className="size-4" aria-hidden />}
                    >
                        Anteriores
                    </Button>
                    <Chip size="sm" variant="flat">
                        Página {pagina} de {paginas}
                    </Chip>
                    <Button
                        size="sm"
                        variant="bordered"
                        isDisabled={pagina >= paginas}
                        onPress={() => irA(pagina + 1)}
                        endContent={<Icon icon="lucide:chevron-right" className="size-4" aria-hidden />}
                    >
                        Siguientes
                    </Button>
                </div>
            )}
        </>
    );
}
