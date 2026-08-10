"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Button, Input, Chip, Tabs, Tab, Spinner, Switch,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    useDisclosure, Tooltip, Snippet,
} from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useTranslations } from "next-intl";

export type ClientApp = {
    id: string;
    clientId: string;
    name: string;
    description?: string | null;
    allowedCallbackUrls: string[];
    allowedDomains: string[];
    scopes: string[];
    signingKeyVersion: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
};

function ChipListEditor({
    label, placeholder, items, onChange, validate,
}: {
    label: string;
    placeholder: string;
    items: string[];
    onChange: (items: string[]) => void;
    validate?: (v: string) => boolean;
}) {
    const t = useTranslations();
    const [input, setInput] = useState("");
    const [error, setError] = useState("");

    function add() {
        const v = input.trim();
        if (!v) return;
        if (validate && !validate(v)) { setError(t('dashboard.clientsManager.invalidValue')); return; }
        if (items.includes(v)) { setError(t('dashboard.clientsManager.alreadyExists')); return; }
        setError(""); setInput("");
        onChange([...items, v]);
    }

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <div className="flex gap-2">
                <Input
                    size="sm" placeholder={placeholder} value={input}
                    onValueChange={(v) => { setInput(v); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    isInvalid={!!error} errorMessage={error}
                    classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }}
                />
                <Button size="sm" variant="bordered" className="shrink-0" onPress={add}>{t('dashboard.clientsManager.add')}</Button>
            </div>
            {items.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {items.map((item) => (
                        <Chip key={item} size="sm" radius="sm" variant="flat"
                            onClose={() => onChange(items.filter((i) => i !== item))}
                            className="max-w-xs truncate">
                            {item}
                        </Chip>
                    ))}
                </div>
            )}
        </div>
    );
}

function isValidUrl(v: string) { try { new URL(v); return true; } catch { return false; } }

function ClientModal({
    isOpen, onClose, initial, onSaved,
}: {
    isOpen: boolean;
    onClose: () => void;
    initial: ClientApp | null;
    onSaved: (client: ClientApp, signingKey?: string) => void;
}) {
    const t = useTranslations();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [clientId, setClientId] = useState("");
    const [callbackUrls, setCallbackUrls] = useState<string[]>([]);
    const [domains, setDomains] = useState<string[]>([]);
    const [scopes, setScopes] = useState<string[]>([]);
    const [active, setActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(initial?.name ?? "");
            setDescription(initial?.description ?? "");
            setClientId(initial?.clientId ?? "");
            setCallbackUrls(initial?.allowedCallbackUrls ?? []);
            setDomains(initial?.allowedDomains ?? []);
            setScopes(initial?.scopes ?? []);
            setActive(initial?.active ?? true);
            setErr("");
        }
    }, [isOpen, initial]);

    async function handleSave() {
        if (!name.trim()) { setErr(t('dashboard.clientsManager.nameRequired')); return; }
        setSaving(true); setErr("");
        try {
            if (initial) {
                const res = await fetch(`/api/admin/clients/${initial.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name, description, allowedCallbackUrls: callbackUrls, allowedDomains: domains, scopes, active }),
                });
                const data = await res.json();
                if (!res.ok) { setErr(data.error ?? t('dashboard.clientsManager.saveError')); return; }
                onSaved(data.client);
            } else {
                if (!clientId.trim() || !/^[a-z0-9-]+$/.test(clientId.trim())) {
                    setErr(t('dashboard.clientsManager.clientIdInvalid')); return;
                }
                const res = await fetch("/api/admin/clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ clientId: clientId.trim(), name, description, allowedCallbackUrls: callbackUrls, allowedDomains: domains, scopes }),
                });
                const data = await res.json();
                if (!res.ok) { setErr(data.error === "already_exists" ? t('dashboard.clientsManager.clientIdExists') : (data.error ?? t('dashboard.clientsManager.createError'))); return; }
                onSaved(data.client, data.signingKey);
            }
            onClose();
        } finally { setSaving(false); }
    }

    const btnClass = "font-semibold border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35 dark:hover:bg-white/10";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2">
                    <Icons.settings className="size-5 text-[#0A2252] dark:text-sky-400" />
                    {initial ? t('dashboard.clientsManager.editClientTitle', { clientId: initial.clientId }) : t('dashboard.clientsManager.newClientTitle')}
                </ModalHeader>
                <ModalBody className="space-y-4 pb-2">
                    {!initial && (
                        <Input label={t('dashboard.clientsManager.clientIdLabel')} size="sm" placeholder={t('dashboard.clientsManager.clientIdPlaceholder')}
                            description={t('dashboard.clientsManager.clientIdDescription')}
                            value={clientId} onValueChange={setClientId}
                            classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }} />
                    )}
                    <Input label={t('dashboard.clientsManager.nameLabel')} size="sm" placeholder={t('dashboard.clientsManager.namePlaceholder')}
                        value={name} onValueChange={setName}
                        classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }} />
                    <Input label={t('dashboard.clientsManager.descriptionLabel')} size="sm" placeholder={t('dashboard.clientsManager.descriptionPlaceholder')}
                        value={description} onValueChange={setDescription}
                        classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }} />
                    <ChipListEditor label={t('dashboard.clientsManager.callbackUrlsLabel')}
                        placeholder={t('dashboard.clientsManager.callbackUrlPlaceholder')}
                        items={callbackUrls} onChange={setCallbackUrls} validate={isValidUrl} />
                    <ChipListEditor label={t('dashboard.clientsManager.domainsLabel')}
                        placeholder={t('dashboard.clientsManager.domainPlaceholder')} items={domains} onChange={setDomains} />
                    <ChipListEditor label={t('dashboard.clientsManager.scopesLabel')}
                        placeholder={t('dashboard.clientsManager.scopePlaceholder')} items={scopes} onChange={setScopes} />
                    {initial && (
                        <div className="flex items-center justify-between rounded-sm border border-gray-100 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
                            <div>
                                <p className="text-sm font-medium">{t('dashboard.clientsManager.activeLabel')}</p>
                                <p className="text-xs text-gray-400">{t('dashboard.clientsManager.activeDescription')}</p>
                            </div>
                            <Switch isSelected={active} onValueChange={setActive} size="sm" />
                        </div>
                    )}
                    {err && <p className="text-xs text-red-500">{err}</p>}
                </ModalBody>
                <ModalFooter>
                    <Button variant="bordered" size="sm" startContent={<Icons.close className="size-4" />} onPress={onClose}>{t('dashboard.common.cancel')}</Button>
                    <Button size="sm" variant="bordered" className={btnClass} isLoading={saving} onPress={handleSave}>
                        {initial ? t('dashboard.clientsManager.saveChanges') : t('dashboard.clientsManager.createClient')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function SigningKeyModal({ signingKey, onClose }: { signingKey: string; onClose: () => void }) {
    const t = useTranslations();
    const btnClass = "font-semibold border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35";
    return (
        <Modal isOpen onClose={onClose} size="lg">
            <ModalContent>
                <ModalHeader className="flex items-center gap-2 text-amber-600">
                    <Icons.keyMinimalistic className="size-5" />
                    {t('dashboard.clientsManager.signingKeyModalTitle')}
                </ModalHeader>
                <ModalBody className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('dashboard.clientsManager.signingKeyModalBody')}
                        <code className="text-xs bg-gray-100 dark:bg-slate-800 px-1 rounded">SERVICE_AUTH_SECRET</code>.
                    </p>
                    <Snippet symbol="" className="w-full text-xs" classNames={{ pre: "whitespace-pre-wrap break-all" }}>
                        {signingKey}
                    </Snippet>
                </ModalBody>
                <ModalFooter>
                    <Button size="sm" variant="bordered" className={btnClass} onPress={onClose}>
                        {t('dashboard.clientsManager.signingKeySaved')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

function ClientsTab({ initialClients }: { initialClients: ClientApp[] }) {
    const t = useTranslations();
    const [clients, setClients] = useState<ClientApp[]>(initialClients);
    const [loading, setLoading] = useState(false);
    const [fetchErr, setFetchErr] = useState("");
    const [selected, setSelected] = useState<ClientApp | null>(null);
    const [creating, setCreating] = useState(false);
    const [pendingSigningKey, setPendingSigningKey] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
    const [revealingId, setRevealingId] = useState<string | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    async function revealSigningKey(client: ClientApp) {
        setRevealingId(client.id);
        try {
            const res = await fetch(`/api/admin/clients/${client.id}/signing-key`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) setRevealedKeys((prev) => ({ ...prev, [client.id]: data.signingKey }));
        } finally { setRevealingId(null); }
    }

    const loadClients = useCallback(async () => {
        setLoading(true); setFetchErr("");
        try {
            const res = await fetch("/api/admin/clients", { credentials: "include" });
            const data = await res.json();
            if (!res.ok) {
                setFetchErr(data?.error === "unauthorized" ? t('dashboard.clientsManager.unauthorizedError') : t('dashboard.clientsManager.loadError'));
                return;
            }
            setClients(data.clients ?? []);
        } catch (error) {
            setFetchErr(t('dashboard.clientsManager.networkError'));
        }
        finally { setLoading(false); }
    }, [t]);

    useEffect(() => {
        setClients(initialClients);
    }, [initialClients]);

    function openEdit(client: ClientApp) { setSelected(client); setCreating(false); onOpen(); }
    function openCreate() { setSelected(null); setCreating(true); onOpen(); }

    function handleSaved(client: ClientApp, signingKey?: string) {
        setClients((prev) => {
            const idx = prev.findIndex((c) => c.id === client.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = client; return next; }
            return [client, ...prev];
        });
        if (signingKey) setPendingSigningKey(signingKey);
    }

    async function handleDisable(client: ClientApp) {
        const res = await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE", credentials: "include" });
        if (res.ok) {
            const data = await res.json();
            setClients((prev) => prev.map((c) => c.id === client.id ? data.client : c));
        }
    }

    const btnClass = "font-semibold border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35 dark:hover:bg-white/10";

    if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
    if (fetchErr) return (
        <div className="text-center py-8 text-red-500 text-sm">
            {fetchErr}
            <Button size="sm" variant="bordered" className="ml-3" startContent={<Icons.refresh className="size-4" />} onPress={loadClients}>{t('dashboard.clientsManager.retry')}</Button>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Icons.shieldKey className="size-4" />
                    {clients.length} {clients.length !== 1 ? t('dashboard.clientsManager.registeredClientsOther') : t('dashboard.clientsManager.registeredClientsOne')}
                </p>
                <Button size="sm" variant="bordered" className={btnClass}
                    startContent={<Icons.plus className="size-4" />} onPress={openCreate}>
                    {t('dashboard.clientsManager.newApp')}
                </Button>
            </div>

            <div className="space-y-3">
                {clients.map((client) => (
                    <div key={client.id}
                        className="p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-3 transition-colors hover:border-[#0A2252]/30 dark:hover:border-white/25">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{client.clientId}</span>
                                    <Chip size="sm" radius="sm" variant="flat" color={client.active ? "success" : "danger"}>
                                        {client.active ? t('dashboard.clientsManager.statusActive') : t('dashboard.clientsManager.statusInactive')}
                                    </Chip>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {client.name}{client.description ? ` — ${client.description}` : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Tooltip content={t('dashboard.clientsManager.editClientTooltip')} size="sm">
                                    <Button size="sm" variant="flat" isIconOnly onPress={() => openEdit(client)}>
                                        <Icons.settingsLinear className="size-4" />
                                    </Button>
                                </Tooltip>
                                {client.active && (
                                    <Tooltip content={t('dashboard.clientsManager.disableClientTooltip')} size="sm" color="danger">
                                        <Button size="sm" variant="flat" color="danger" isIconOnly onPress={() => handleDisable(client)}>
                                            <Icons.powerOff className="size-4" />
                                        </Button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                {t('dashboard.clientsManager.callbackUrlsCount', { count: client.allowedCallbackUrls.length })}
                            </p>
                            {client.allowedCallbackUrls.length === 0 ? (
                                <p className="text-xs text-red-500 font-medium">{t('dashboard.clientsManager.noCallbackUrls')}</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {client.allowedCallbackUrls.map((url) => (
                                        <Chip key={url} size="sm" radius="sm" variant="flat" color="primary" className="font-mono text-xs max-w-xs truncate">{url}</Chip>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    {t('dashboard.clientsManager.domainsCount', { count: client.allowedDomains.length })}
                                </p>
                                {client.allowedDomains.length === 0 ? (
                                    <p className="text-xs text-gray-400">{t('dashboard.clientsManager.none')}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {client.allowedDomains.map((d) => (
                                            <Chip key={d} size="sm" radius="sm" variant="flat" className="font-mono text-xs">{d}</Chip>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    {t('dashboard.clientsManager.scopesCount', { count: client.scopes.length })}
                                </p>
                                {client.scopes.length === 0 ? (
                                    <p className="text-xs text-gray-400">{t('dashboard.clientsManager.none')}</p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {client.scopes.map((s) => (
                                            <Chip key={s} size="sm" radius="sm" variant="flat" color="secondary" className="text-xs">{s}</Chip>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                {t('dashboard.clientsManager.signingKeyLabel')}
                            </p>
                            {revealedKeys[client.id] ? (
                                <Snippet
                                    symbol=""
                                    size="sm"
                                    className="w-full text-xs"
                                    classNames={{ pre: "whitespace-pre-wrap break-all font-mono" }}
                                >
                                    {revealedKeys[client.id]}
                                </Snippet>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="bordered"
                                    isLoading={revealingId === client.id}
                                    startContent={revealingId !== client.id ? <Icons.keyMinimalistic className="size-3.5" /> : undefined}
                                    onPress={() => revealSigningKey(client)}
                                    className="text-xs"
                                >
                                    {t('dashboard.clientsManager.reveal')}
                                </Button>
                            )}
                        </div>

                        <p className="text-[10px] text-gray-400">
                            {t('dashboard.clientsManager.keyVersionUpdated', { version: client.signingKeyVersion, date: client.updatedAt.slice(0, 16).replace('T', ' ') })}
                        </p>
                    </div>
                ))}
                {clients.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-gray-200 py-12 text-center text-gray-400 text-sm dark:border-slate-700">
                        <Icons.shieldKey className="size-8" />
                        {t('dashboard.clientsManager.noClientApps')}
                    </div>
                )}
            </div>

            <ClientModal
                isOpen={isOpen || creating}
                onClose={() => { onClose(); setCreating(false); setSelected(null); }}
                initial={selected}
                onSaved={handleSaved}
            />
            {pendingSigningKey && (
                <SigningKeyModal signingKey={pendingSigningKey} onClose={() => setPendingSigningKey(null)} />
            )}
        </div>
    );
}

export function AdminDashboard({ initialClients = [] }: { initialClients?: ClientApp[] }) {
    return <ClientsTab initialClients={initialClients} />;
}
