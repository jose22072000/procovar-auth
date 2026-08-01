// Catálogo central de permisos. Los roles se arman eligiendo de esta lista.
// Un permiso es una clave "modulo.recurso.accion". Las apps conectadas validan
// contra estas claves. Es extensible: se pueden añadir grupos/claves aquí.

export interface PermissionDef {
    key: string;
    label: string;
}

export interface PermissionGroup {
    module: string;
    label: string;
    permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
    {
        module: "identidad",
        label: "Identidad (auth central)",
        permissions: [
            { key: "users.read", label: "Ver usuarios" },
            { key: "users.create", label: "Crear usuarios" },
            { key: "users.update", label: "Editar usuarios" },
            { key: "users.delete", label: "Eliminar usuarios" },
            { key: "roles.read", label: "Ver roles" },
            { key: "roles.manage", label: "Gestionar roles y permisos" },
            { key: "orgs.read", label: "Ver organizaciones/sucursales" },
            { key: "orgs.manage", label: "Gestionar organizaciones/sucursales" },
            { key: "audit.read", label: "Ver auditoría" },
        ],
    },
    {
        module: "pedido",
        label: "PEDIDO",
        permissions: [
            { key: "pedido.orders.read", label: "Ver pedidos" },
            { key: "pedido.orders.write", label: "Crear/editar pedidos" },
            { key: "pedido.import", label: "Importar pedidos (CSV)" },
            { key: "pedido.reports", label: "Ver reportes" },
        ],
    },
    {
        module: "delivery",
        label: "Delivery",
        permissions: [
            { key: "delivery.orders.read", label: "Ver pedidos de domicilio" },
            { key: "delivery.routes.manage", label: "Gestionar rutas" },
            { key: "delivery.vehicles.manage", label: "Gestionar vehículos" },
            { key: "delivery.branches.manage", label: "Gestionar sucursales/origen" },
            { key: "delivery.settings.manage", label: "Configurar tarifas de domicilio" },
        ],
    },
    {
        module: "analitics",
        label: "Analitics",
        permissions: [
            { key: "analitics.view", label: "Ver dashboards" },
            { key: "analitics.export", label: "Exportar reportes" },
            { key: "analitics.config", label: "Configurar gestores/metas" },
        ],
    },
];

/** Lista plana de todas las claves conocidas. */
export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((g) =>
    g.permissions.map((p) => p.key),
);

export function isKnownPermission(key: string): boolean {
    return ALL_PERMISSIONS.includes(key);
}

// Comodín: un rol con "*" concede todos los permisos (útil para super-admin).
export const WILDCARD = "*";
