"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Checkbox,
    Chip,
    Divider,
    Input,
    Select,
    SelectItem,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Tabs,
    Textarea,
} from "@heroui/react";

interface PermDef { key: string; label: string }
interface PermGroup { module: string; label: string; permissions: PermDef[] }
interface Role { id: string; name: string; slug: string; organizationId: string | null; permissions: string[]; _count?: { userRoles: number } }
interface UserRow { id: string; name: string; email: string; isSystemAdmin: boolean; roles: { id: string; name: string; slug: string }[] }

async function jget(url: string) {
    const r = await fetch(url, { credentials: "include" });
    return r.ok ? r.json() : {};
}

export function RolesManager() {
    const [catalog, setCatalog] = useState<PermGroup[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);

    // form de creación
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    const loadAll = useCallback(async () => {
        const [c, r, u] = await Promise.all([
            jget("/api/permissions"),
            jget("/api/roles"),
            jget("/api/users"),
        ]);
        setCatalog(c.catalog || []);
        setRoles(r.roles || []);
        setUsers(u.users || []);
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const togglePerm = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    async function createRole() {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, description, permissions: [...selected] }),
            });
            if (!res.ok) { alert((await res.json()).error || "No se pudo crear"); return; }
            setName(""); setDescription(""); setSelected(new Set());
            await loadAll();
        } finally { setSaving(false); }
    }

    async function deleteRole(id: string) {
        if (!confirm("¿Eliminar este rol?")) return;
        const res = await fetch(`/api/roles/${id}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) { alert((await res.json()).error || "No se pudo eliminar"); return; }
        await loadAll();
    }

    async function assignRole(userId: string, roleId: string) {
        await fetch(`/api/users/${userId}/roles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ roleIds: [roleId] }),
        });
        await loadAll();
    }

    async function unassignRole(userId: string, roleId: string) {
        await fetch(`/api/users/${userId}/roles?roleId=${roleId}`, { method: "DELETE", credentials: "include" });
        await loadAll();
    }

    const totalPerms = useMemo(() => catalog.reduce((a, g) => a + g.permissions.length, 0), [catalog]);

    return (
        <Tabs aria-label="Gestión">
            <Tab key="roles" title="Roles">
                <div className="grid lg:grid-cols-2 gap-6 mt-4">
                    {/* Crear rol */}
                    <Card>
                        <CardHeader className="font-semibold">Nuevo rol</CardHeader>
                        <CardBody className="space-y-4">
                            <Input label="Nombre" value={name} onValueChange={setName} size="sm" />
                            <Textarea label="Descripción" value={description} onValueChange={setDescription} size="sm" minRows={1} />
                            <div className="space-y-3 max-h-[340px] overflow-auto pr-1">
                                {catalog.map((g) => (
                                    <div key={g.module}>
                                        <p className="text-xs font-semibold uppercase text-default-500 mb-1">{g.label}</p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {g.permissions.map((p) => (
                                                <Checkbox key={p.key} size="sm" isSelected={selected.has(p.key)} onValueChange={() => togglePerm(p.key)}>
                                                    <span className="text-sm">{p.label} <span className="text-default-400">({p.key})</span></span>
                                                </Checkbox>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-default-500">{selected.size}/{totalPerms} permisos</span>
                                <Button color="primary" size="sm" onPress={createRole} isLoading={saving}>Crear rol</Button>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Lista de roles */}
                    <Card>
                        <CardHeader className="font-semibold">Roles ({roles.length})</CardHeader>
                        <CardBody>
                            <Table aria-label="Roles" removeWrapper>
                                <TableHeader>
                                    <TableColumn>ROL</TableColumn>
                                    <TableColumn>PERMISOS</TableColumn>
                                    <TableColumn>USUARIOS</TableColumn>
                                    <TableColumn> </TableColumn>
                                </TableHeader>
                                <TableBody emptyContent="Aún no hay roles.">
                                    {roles.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div className="font-medium">{r.name}</div>
                                                <div className="text-xs text-default-400">{r.organizationId ? "sucursal" : "global"}</div>
                                            </TableCell>
                                            <TableCell><Chip size="sm" variant="flat">{r.permissions.includes("*") ? "todos (*)" : r.permissions.length}</Chip></TableCell>
                                            <TableCell>{r._count?.userRoles ?? 0}</TableCell>
                                            <TableCell><Button size="sm" variant="light" color="danger" onPress={() => deleteRole(r.id)}>Borrar</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardBody>
                    </Card>
                </div>
            </Tab>

            <Tab key="users" title="Usuarios">
                <Card className="mt-4">
                    <CardHeader className="font-semibold">Usuarios ({users.length}) — asignar roles</CardHeader>
                    <CardBody>
                        <Table aria-label="Usuarios" removeWrapper>
                            <TableHeader>
                                <TableColumn>USUARIO</TableColumn>
                                <TableColumn>ROLES</TableColumn>
                                <TableColumn>AGREGAR ROL</TableColumn>
                            </TableHeader>
                            <TableBody emptyContent="Sin usuarios.">
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="font-medium">{u.name}{u.isSystemAdmin && <Chip size="sm" color="warning" variant="flat" className="ml-2">super-admin</Chip>}</div>
                                            <div className="text-xs text-default-400">{u.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {u.roles.length === 0 && <span className="text-default-400 text-sm">—</span>}
                                                {u.roles.map((r) => (
                                                    <Chip key={r.id} size="sm" variant="flat" onClose={() => unassignRole(u.id, r.id)}>{r.name}</Chip>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                aria-label="Agregar rol"
                                                size="sm"
                                                className="max-w-[200px]"
                                                placeholder="Elegir rol…"
                                                selectedKeys={[]}
                                                onSelectionChange={(keys) => {
                                                    const id = Array.from(keys as Set<string>)[0];
                                                    if (id) assignRole(u.id, id);
                                                }}
                                            >
                                                {roles
                                                    .filter((r) => !u.roles.some((ur) => ur.id === r.id))
                                                    .map((r) => (
                                                        <SelectItem key={r.id}>{r.name}</SelectItem>
                                                    ))}
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Divider className="my-3" />
                        <p className="text-xs text-default-500">Los permisos de un usuario son la unión de todos sus roles.</p>
                    </CardBody>
                </Card>
            </Tab>
        </Tabs>
    );
}
