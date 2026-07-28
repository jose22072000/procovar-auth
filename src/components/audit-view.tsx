"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";

interface AuditLog {
    id: string;
    clientId: string | null;
    action: string;
    resource: string | null;
    status: string;
    ipAddress: string | null;
    createdAt: string;
    user?: { id: string; name: string; email: string } | null;
}

export function AuditView() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [clientId, setClientId] = useState("");
    const [action, setAction] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (clientId) params.set("clientId", clientId);
            if (action) params.set("action", action);
            params.set("limit", "200");
            const res = await fetch(`/api/audit?${params}`, { credentials: "include" });
            const data = await res.json();
            setLogs(Array.isArray(data.logs) ? data.logs : []);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [clientId, action]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Card>
            <CardBody className="p-4 space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <Input
                        label="Client (app)"
                        placeholder="pedido, delivery, analitics…"
                        value={clientId}
                        onValueChange={setClientId}
                        className="max-w-[220px]"
                        size="sm"
                    />
                    <Input
                        label="Acción"
                        placeholder="sign-in, order.create…"
                        value={action}
                        onValueChange={setAction}
                        className="max-w-[220px]"
                        size="sm"
                    />
                    <Button color="primary" size="sm" onPress={load} isLoading={loading}>
                        Filtrar
                    </Button>
                    <span className="text-sm text-default-500 ml-auto">{logs.length} eventos</span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Spinner />
                    </div>
                ) : (
                    <Table aria-label="Auditoría" removeWrapper isHeaderSticky>
                        <TableHeader>
                            <TableColumn>FECHA</TableColumn>
                            <TableColumn>USUARIO</TableColumn>
                            <TableColumn>CLIENT</TableColumn>
                            <TableColumn>ACCIÓN</TableColumn>
                            <TableColumn>ESTADO</TableColumn>
                            <TableColumn>RECURSO</TableColumn>
                            <TableColumn>IP</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="Sin eventos de auditoría.">
                            {logs.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell className="whitespace-nowrap text-xs">
                                        {new Date(l.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {l.user?.name || l.user?.email || "—"}
                                    </TableCell>
                                    <TableCell>
                                        {l.clientId ? (
                                            <Chip size="sm" variant="flat" color="secondary">
                                                {l.clientId}
                                            </Chip>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">{l.action}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            color={l.status === "failure" ? "danger" : "success"}
                                        >
                                            {l.status}
                                        </Chip>
                                    </TableCell>
                                    <TableCell className="text-xs text-default-500">
                                        {l.resource || "—"}
                                    </TableCell>
                                    <TableCell className="text-xs text-default-500">
                                        {l.ipAddress || "—"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardBody>
        </Card>
    );
}
