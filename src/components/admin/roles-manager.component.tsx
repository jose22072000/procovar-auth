"use client";

import { useMemo, useState } from "react";
import { Button, Checkbox, Chip, Input, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export type PermisoDisponible = {
    key: string;
    group: string;
    service: string;
    label: { es?: string; en?: string } | null;
};

export type RolEditable = {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissionKeys: string[];
    memberCount: number;
};

/** Cómo se llama cada aplicación en pantalla. La clave es `Permission.service`. */
const NOMBRE_SERVICIO: Record<string, string> = {
    pedido: "PEDIDO",
    analitics: "Analitics",
    delivery: "Delivery",
    ccsa: "Tablero Parranda",
    auth: "Accesos",
};

const ICONO_SERVICIO: Record<string, string> = {
    pedido: "lucide:clipboard-list",
    analitics: "lucide:bar-chart-3",
    delivery: "lucide:truck",
    ccsa: "lucide:layout-dashboard",
    auth: "lucide:key-round",
};

/**
 * Cambiar lo que puede hacer cada rol, sin tocar código.
 *
 * Los permisos se agrupan por APLICACIÓN antes que por nada. Quien viene a esta
 * pantalla viene con una frase en la cabeza —"que el operador pueda ver los
 * informes"— y lo primero que necesita saber es de qué aplicación habla, porque
 * "informes" existe en PEDIDO y en Analitics y no son lo mismo.
 *
 * Un rol es de toda Procovar: lo que se marque aquí vale para las ocho
 * sucursales a la vez. Por eso se avisa en pantalla y por eso el servidor solo
 * se lo permite al Super Admin.
 */
export function RolesManager({
    roles,
    permisos,
    puedeEditar,
}: {
    roles: RolEditable[];
    permisos: PermisoDisponible[];
    puedeEditar: boolean;
}) {
    const t = useTranslations();
    const router = useRouter();

    const [rolActivoId, setRolActivoId] = useState(roles[0]?.id ?? "");
    const [seleccion, setSeleccion] = useState<Set<string>>(
        () => new Set(roles[0]?.permissionKeys ?? []),
    );
    const [busca, setBusca] = useState("");
    const [guardando, setGuardando] = useState(false);

    const rolActivo = roles.find((r) => r.id === rolActivoId) ?? roles[0];

    // Lo guardado, para saber si hay cambios sin guardar. Se compara por
    // contenido: dos conjuntos con las mismas claves son el mismo permiso
    // aunque sean objetos distintos.
    const guardado = useMemo(
        () => new Set(rolActivo?.permissionKeys ?? []),
        [rolActivo],
    );
    const hayCambios =
        seleccion.size !== guardado.size || [...seleccion].some((k) => !guardado.has(k));

    function cambiarRol(id: string) {
        if (hayCambios && !confirm(t("dashboard.rolesManager.descartarCambios"))) return;
        setRolActivoId(id);
        setSeleccion(new Set(roles.find((r) => r.id === id)?.permissionKeys ?? []));
    }

    function alternar(key: string) {
        setSeleccion((prev) => {
            const s = new Set(prev);
            if (s.has(key)) s.delete(key); else s.add(key);
            return s;
        });
    }

    /** Permisos visibles, agrupados por aplicación y dentro por apartado. */
    const porServicio = useMemo(() => {
        const q = busca.trim().toLowerCase();
        const visibles = q
            ? permisos.filter(
                (p) =>
                    p.key.toLowerCase().includes(q) ||
                    (p.label?.es ?? "").toLowerCase().includes(q) ||
                    p.group.toLowerCase().includes(q) ||
                    (NOMBRE_SERVICIO[p.service] ?? p.service).toLowerCase().includes(q),
            )
            : permisos;

        const mapa = new Map<string, Map<string, PermisoDisponible[]>>();
        for (const p of visibles) {
            if (!mapa.has(p.service)) mapa.set(p.service, new Map());
            const grupos = mapa.get(p.service)!;
            if (!grupos.has(p.group)) grupos.set(p.group, []);
            grupos.get(p.group)!.push(p);
        }
        return [...mapa.entries()];
    }, [permisos, busca]);

    function marcarServicio(service: string, marcar: boolean) {
        const claves = permisos.filter((p) => p.service === service).map((p) => p.key);
        setSeleccion((prev) => {
            const s = new Set(prev);
            for (const k of claves) { if (marcar) s.add(k); else s.delete(k); }
            return s;
        });
    }

    async function guardar() {
        if (!rolActivo) return;
        setGuardando(true);
        try {
            const res = await fetch(`/api/rbac/roles/${rolActivo.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissionKeys: [...seleccion] }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                addToast({
                    title: t("dashboard.rolesManager.guardadoTitulo", { rol: rolActivo.name }),
                    description: t("dashboard.rolesManager.guardadoDescripcion", { n: seleccion.size }),
                    color: "success",
                });
                router.refresh();
            } else {
                addToast({
                    title: t("dashboard.rolesManager.errorTitulo"),
                    description: data.error ?? "",
                    color: "danger",
                });
            }
        } finally {
            setGuardando(false);
        }
    }

    if (!rolActivo) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400 dark:border-slate-700">
                {t("dashboard.rolesManager.sinRoles")}
            </div>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            {/* Los roles */}
            <div className="space-y-1.5">
                {roles.map((r) => {
                    const activo = r.id === rolActivo.id;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => cambiarRol(r.id)}
                            className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${activo
                                ? "border-[#0A2252] bg-[#0A2252] text-white dark:border-sky-500 dark:bg-sky-600"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold">{r.name}</span>
                                {r.isSystem && (
                                    <Icon
                                        icon="lucide:lock"
                                        className={`ml-auto size-3.5 shrink-0 ${activo ? "opacity-70" : "text-slate-400"}`}
                                        aria-label={t("dashboard.rolesManager.rolDelSistema")}
                                    />
                                )}
                            </div>
                            <p className={`mt-0.5 line-clamp-2 text-xs ${activo ? "opacity-80" : "text-slate-500"}`}>
                                {r.description ?? ""}
                            </p>
                            <p className={`mt-1 text-[11px] ${activo ? "opacity-70" : "text-slate-400"}`}>
                                {t("dashboard.rolesManager.personas", { n: r.memberCount })} ·{" "}
                                {t("dashboard.rolesManager.permisos", { n: r.permissionKeys.length })}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Los permisos del rol elegido */}
            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{rolActivo.name}</h2>
                        <p className="text-sm text-slate-500">{t("dashboard.rolesManager.avisoGlobal")}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {hayCambios && (
                            <Chip size="sm" color="warning" variant="flat">
                                {t("dashboard.rolesManager.sinGuardar")}
                            </Chip>
                        )}
                        <Button
                            color="primary"
                            isDisabled={!puedeEditar || !hayCambios}
                            isLoading={guardando}
                            onPress={guardar}
                            startContent={!guardando ? <Icon icon="lucide:save" className="size-4" aria-hidden /> : undefined}
                        >
                            {t("dashboard.rolesManager.guardar")}
                        </Button>
                    </div>
                </div>

                {!puedeEditar && (
                    <div className="flex items-start gap-2 border-b border-slate-100 bg-amber-50 p-3 text-sm text-amber-700 dark:border-slate-800 dark:bg-amber-950/30 dark:text-amber-300">
                        <Icon icon="lucide:triangle-alert" className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span>{t("dashboard.rolesManager.soloSuperAdmin")}</span>
                    </div>
                )}

                <div className="p-4">
                    <Input
                        className="mb-4 max-w-xs"
                        variant="bordered"
                        size="sm"
                        placeholder={t("dashboard.rolesManager.buscar")}
                        value={busca}
                        onValueChange={setBusca}
                        isClearable
                        onClear={() => setBusca("")}
                        startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
                    />

                    {porServicio.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
                            {t("dashboard.rolesManager.nadaQueCoincida")}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {porServicio.map(([service, grupos]) => {
                                const claves = permisos.filter((p) => p.service === service).map((p) => p.key);
                                const marcados = claves.filter((k) => seleccion.has(k)).length;
                                return (
                                    <div key={service} className="rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                                            <Icon
                                                icon={ICONO_SERVICIO[service] ?? "lucide:box"}
                                                className="size-4 text-slate-500"
                                                aria-hidden
                                            />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                                {NOMBRE_SERVICIO[service] ?? service}
                                            </h3>
                                            <Chip size="sm" variant="flat" className="ml-2">
                                                {marcados}/{claves.length}
                                            </Chip>
                                            <div className="ml-auto flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    isDisabled={!puedeEditar}
                                                    onPress={() => marcarServicio(service, true)}
                                                >
                                                    {t("dashboard.rolesManager.todo")}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    isDisabled={!puedeEditar}
                                                    onPress={() => marcarServicio(service, false)}
                                                >
                                                    {t("dashboard.rolesManager.nada")}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {[...grupos.entries()].map(([grupo, lista]) => (
                                                <div key={grupo} className="px-3 py-2.5">
                                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                        {grupo}
                                                    </p>
                                                    <div className="grid gap-1.5 sm:grid-cols-2">
                                                        {lista.map((p) => (
                                                            <Checkbox
                                                                key={p.key}
                                                                size="sm"
                                                                isDisabled={!puedeEditar}
                                                                isSelected={seleccion.has(p.key)}
                                                                onValueChange={() => alternar(p.key)}
                                                            >
                                                                <span className="text-sm">{p.label?.es ?? p.key}</span>
                                                                <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                                                                    {p.key}
                                                                </span>
                                                            </Checkbox>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
