"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Accordion,
    AccordionItem,
    Alert,
    Button,
    Card,
    CardBody,
    CardHeader,
    Chip,
    Code,
    Divider,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Input,
    Select,
    SelectItem,
    Snippet,
    Spinner,
    Tab,
    Tabs,
    Tooltip,
    addToast,
} from "@heroui/react";
// Modal en la computadora, cajón desde abajo en el móvil. Estos tres eran `Drawer` a
// pelo, y uno de ellos con `placement="right"`: un cajón lateral en un teléfono deja el
// formulario contra el borde y el botón de guardar debajo del teclado, que es justo lo
// que `Panel` existe para evitar.
import { Panel } from "@/components/ui/panel";
import { Icons } from "@/components/icons/iconify";
import type {
    MicroserviceInfo,
    ScopeDefinition,
    ScopePreset,
    ScopeRisk,
} from "@/lib/scopes-catalog";

// ──────────────────────────────────────────────────────────────────────────
// Types matching the admin API responses
// ──────────────────────────────────────────────────────────────────────────
interface ClientApp {
    id: string;
    clientId: string;
    name: string;
    description?: string | null;
    signingKeyVersion: number;
    allowedCallbackUrls: string[];
    allowedDomains: string[];
    scopes: string[];
    active: boolean;
    createdAt: string;
}

interface ApiKey {
    id: string;
    prefix: string;
    name: string;
    scopes: string[];
    clientAppId?: string | null;
    userId?: string | null;
    lastUsedAt?: string | null;
    expiresAt?: string | null;
    revokedAt?: string | null;
    createdAt: string;
}

interface ScopesPayload {
    scopes: ScopeDefinition[];
    presets: ScopePreset[];
    microservices: MicroserviceInfo[];
    roles: Record<string, string[]>;
}

const RISK_COLOR: Record<ScopeRisk, "default" | "warning" | "danger" | "success"> = {
    read: "success",
    write: "warning",
    admin: "danger",
};

// ──────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────
export function ApiKeysManager() {
    const t = useTranslations();
    const [scopesData, setScopesData] = useState<ScopesPayload | null>(null);
    const [clients, setClients] = useState<ClientApp[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshAll = async () => {
        setLoading(true);
        try {
            const [s, c, k] = await Promise.all([
                fetch("/api/admin/scopes").then(r => r.json()),
                fetch("/api/admin/clients").then(r => r.json()),
                fetch("/api/admin/api-keys").then(r => r.json()),
            ]);
            setScopesData(s);
            setClients(c.clients ?? []);
            setApiKeys(k.apiKeys ?? []);
        } catch (e) {
            addToast({
                title: t('apiKeys.toast.loadFailedTitle'),
                description: e instanceof Error ? e.message : String(e),
                color: "danger",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshAll();
    }, []);

    if (loading || !scopesData) {
        return (
            <div className="flex justify-center py-20">
                <Spinner size="lg" label={t('apiKeys.loadingLabel')} />
            </div>
        );
    }

    return (
        <Tabs aria-label={t('apiKeys.tabs.ariaLabel')} variant="underlined" color="primary" classNames={{ tabList: "overflow-x-auto" }}>
            <Tab key="help" title={t('apiKeys.tabs.help')}>
                <HelpSection scopesData={scopesData} />
            </Tab>
            <Tab key="clients" title={t('apiKeys.tabs.serviceClients', { count: clients.length })}>
                <ClientsTab
                    clients={clients}
                    scopesData={scopesData}
                    onChange={refreshAll}
                />
            </Tab>
            <Tab key="apikeys" title={t('apiKeys.tabs.apiKeysTab', { count: apiKeys.length })}>
                <ApiKeysTab
                    apiKeys={apiKeys}
                    clients={clients}
                    scopesData={scopesData}
                    onChange={refreshAll}
                />
            </Tab>
            <Tab key="scopes" title={t('apiKeys.tabs.scopeCatalog', { count: scopesData.scopes.length })}>
                <ScopeCatalogTab scopesData={scopesData} />
            </Tab>
        </Tabs>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Help section
// ──────────────────────────────────────────────────────────────────────────
function HelpSection({ scopesData }: { scopesData: ScopesPayload }) {
    const t = useTranslations();
    return (
        <div className="space-y-6 py-4">
            <Alert
                color="primary"
                variant="flat"
                title={t('apiKeys.help.whatIsThis.title')}
                description={t('apiKeys.help.whatIsThis.description')}
            />

            <Alert
                color="warning"
                variant="faded"
                title={t('apiKeys.help.noKey.title')}
                description={
                    <div className="space-y-2 text-sm mt-2">
                        <p>
                            {t.rich('apiKeys.help.noKey.p1', {
                                strong: (chunks) => <strong>{chunks}</strong>,
                            })}
                        </p>
                        <Code size="sm" className="text-xs">
                            HMAC(SERVICE_AUTH_SECRET, &quot;svc:v&lt;version&gt;:&lt;clientId&gt;&quot;)
                        </Code>
                        <p>
                            {t.rich('apiKeys.help.noKey.p2', {
                                strong: (chunks) => <strong>{chunks}</strong>,
                            })}
                        </p>
                        <p>
                            {t.rich('apiKeys.help.noKey.p3', {
                                code: (chunks) => <Code size="sm">{chunks}</Code>,
                                em: (chunks) => <em>{chunks}</em>,
                            })}
                        </p>
                    </div>
                }
            />

            <Card>
                <CardHeader className="flex flex-col items-start gap-1">
                    <h2 className="text-xl font-semibold">{t('apiKeys.help.credTypes.title')}</h2>
                    <p className="text-default-500 text-sm">
                        {t('apiKeys.help.credTypes.subtitle')}
                    </p>
                </CardHeader>
                <CardBody className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <CredentialCard
                        title={t('apiKeys.help.credential.serviceClient.title')}
                        chip="signingKey"
                        chipColor="primary"
                        whenLabel={t('apiKeys.help.credential.whenLabel')}
                        when={t('apiKeys.help.credential.serviceClient.when')}
                        how={[
                            t('apiKeys.help.credential.serviceClient.how1'),
                            t('apiKeys.help.credential.serviceClient.how2'),
                            t('apiKeys.help.credential.serviceClient.how3'),
                            t('apiKeys.help.credential.serviceClient.how4'),
                        ]}
                        envExample={`# Lives in the consumer's env (e.g. qb-back):\nSERVICE_CLIENT_ID=qb-back\nSERVICE_SIGNING_KEY=<hex 64 chars>   # only this client's key\nSERVICE_KEY_VERSION=1`}
                    />
                    <CredentialCard
                        title={t('apiKeys.help.credential.apiKey.title')}
                        chip="apiKey"
                        chipColor="secondary"
                        whenLabel={t('apiKeys.help.credential.whenLabel')}
                        when={t('apiKeys.help.credential.apiKey.when')}
                        how={[
                            t('apiKeys.help.credential.apiKey.how1'),
                            t('apiKeys.help.credential.apiKey.how2'),
                            t('apiKeys.help.credential.apiKey.how3'),
                        ]}
                        envExample={`# In your script:\ncurl -H "Authorization: Bearer qbk_prod_abcd1234_…" …`}
                    />
                    <CredentialCard
                        title={t('apiKeys.help.credential.adminSession.title')}
                        chip="cookie"
                        chipColor="warning"
                        whenLabel={t('apiKeys.help.credential.whenLabel')}
                        when={t('apiKeys.help.credential.adminSession.when')}
                        how={[
                            t('apiKeys.help.credential.adminSession.how1'),
                            t('apiKeys.help.credential.adminSession.how2'),
                            t('apiKeys.help.credential.adminSession.how3'),
                        ]}
                        envExample={`# Toggle in DB:\nUPDATE "user" SET "isSystemAdmin"=true WHERE email='you@x';`}
                    />
                </CardBody>
            </Card>

            <Card>
                <CardHeader className="flex flex-col items-start gap-1">
                    <h2 className="text-xl font-semibold">
                        {t('apiKeys.help.microservices.title')}
                    </h2>
                    <p className="text-default-500 text-sm">
                        {t('apiKeys.help.microservices.subtitle')}
                    </p>
                </CardHeader>
                <CardBody className="space-y-3">
                    {scopesData.microservices.map(m => (
                        <Card key={m.id} shadow="none" className="border border-default-200">
                            <CardBody className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{m.name}</p>
                                    {m.baseUrl && (
                                        <Code size="sm" className="text-xs">{m.baseUrl}</Code>
                                    )}
                                </div>
                                <p className="text-sm text-default-600">{m.role}</p>
                                <div className="flex flex-wrap gap-1">
                                    {m.id === "qb-auth" ? (
                                        <Chip radius="sm" size="sm" color="warning" variant="flat">
                                            {t('apiKeys.help.microservices.ownsEverything')}
                                        </Chip>
                                    ) : (
                                        <>
                                            <Chip radius="sm" size="sm" color="primary" variant="flat">
                                                {t('apiKeys.help.microservices.serviceClientChip')}
                                            </Chip>
                                            {(m.id === "qb-back" || m.id === "qb-notify") && (
                                                <Chip radius="sm" size="sm" color="secondary" variant="flat">
                                                    {t('apiKeys.help.microservices.verifiesApiKeys')}
                                                </Chip>
                                            )}
                                        </>
                                    )}
                                </div>
                                <ScopeChips
                                    scopes={recommendedFor(m.id, scopesData)}
                                    catalog={scopesData.scopes}
                                />
                            </CardBody>
                        </Card>
                    ))}
                </CardBody>
            </Card>

            <Accordion variant="splitted">
                <AccordionItem
                    key="how-create-client"
                    aria-label={t('apiKeys.help.accordion.onboard.ariaLabel')}
                    title={t('apiKeys.help.accordion.onboard.title')}
                >
                    <ol className="list-decimal pl-6 space-y-2 text-sm text-default-700">
                        <li>
                            {t.rich('apiKeys.help.accordion.onboard.step1', {
                                strong: (chunks) => <strong>{chunks}</strong>,
                                em: (chunks) => <em>{chunks}</em>,
                            })}
                        </li>
                        <li>
                            {t.rich('apiKeys.help.accordion.onboard.step2', {
                                em: (chunks) => <em>{chunks}</em>,
                            })}
                        </li>
                        <li>
                            {t.rich('apiKeys.help.accordion.onboard.step3', {
                                code: (chunks) => <code>{chunks}</code>,
                            })}
                        </li>
                        <li>
                            {t.rich('apiKeys.help.accordion.onboard.step4', {
                                code: (chunks) => <code>{chunks}</code>,
                            })}
                        </li>
                        <li>
                            {t('apiKeys.help.accordion.onboard.step5Prefix')} <code>POST /api/auth/verify-session</code> — {t('apiKeys.help.accordion.onboard.step5Suffix')} <code>{`{ ok: true }`}</code>.
                        </li>
                    </ol>
                </AccordionItem>
                <AccordionItem
                    key="how-rotate"
                    aria-label={t('apiKeys.help.accordion.rotate.ariaLabel')}
                    title={t('apiKeys.help.accordion.rotate.title')}
                >
                    <ol className="list-decimal pl-6 space-y-2 text-sm text-default-700">
                        <li>
                            {t.rich('apiKeys.help.accordion.rotate.step1', {
                                em: (chunks) => <em>{chunks}</em>,
                            })}
                        </li>
                        <li>
                            {t.rich('apiKeys.help.accordion.rotate.step2', {
                                code: (chunks) => <code>{chunks}</code>,
                            })}
                        </li>
                        <li>
                            {t('apiKeys.help.accordion.rotate.step3')}
                        </li>
                    </ol>
                </AccordionItem>
                <AccordionItem
                    key="how-scopes"
                    aria-label={t('apiKeys.help.accordion.scopes.ariaLabel')}
                    title={t('apiKeys.help.accordion.scopes.title')}
                >
                    <p className="text-sm text-default-700 mb-2">
                        {t('apiKeys.help.accordion.scopes.intro')}
                    </p>
                    <Snippet hideSymbol size="sm" className="mb-3">
                        src/lib/scopes-catalog.ts
                    </Snippet>
                    <p className="text-sm text-default-700">
                        {t('apiKeys.help.accordion.scopes.howToAdd')}
                    </p>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

function CredentialCard(props: {
    title: string;
    chip: string;
    chipColor: "primary" | "secondary" | "warning";
    whenLabel: string;
    when: string;
    how: string[];
    envExample: string;
}) {
    return (
        <Card shadow="sm" className="border border-default-200">
            <CardHeader className="flex items-center justify-between">
                <h3 className="font-semibold">{props.title}</h3>
                <Chip radius="sm" size="sm" color={props.chipColor} variant="flat">
                    {props.chip}
                </Chip>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
                <p className="text-default-600">
                    <strong>{props.whenLabel}</strong> {props.when}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-default-700">
                    {props.how.map(h => (
                        <li key={h}>{h}</li>
                    ))}
                </ul>
                <Snippet
                    size="sm"
                    classNames={{ pre: "whitespace-pre-wrap text-xs" }}
                    hideSymbol
                >
                    {props.envExample}
                </Snippet>
            </CardBody>
        </Card>
    );
}

function recommendedFor(serviceId: string, data: ScopesPayload): string[] {
    return data.scopes
        .filter(s => s.suggestedFor?.includes(serviceId))
        .map(s => s.id);
}

function ScopeChips({
    scopes,
    catalog,
}: {
    scopes: string[];
    catalog: ScopeDefinition[];
}) {
    const t = useTranslations();
    const byId = useMemo(
        () => Object.fromEntries(catalog.map(s => [s.id, s])),
        [catalog],
    );
    if (scopes.length === 0) {
        return (
            <span className="text-default-400 text-xs italic">{t('apiKeys.scopeChips.none')}</span>
        );
    }
    return (
        <div className="flex flex-wrap gap-1">
            {scopes.map(id => {
                const def = byId[id];
                const color = def ? RISK_COLOR[def.risk] : "default";
                return (
                    <Tooltip
                        key={id}
                        content={def?.description ?? t('apiKeys.scopeChips.unknownScope')}
                        placement="top"
                    >
                        <Chip radius="sm" size="sm" variant="flat" color={color}>
                            {id}
                        </Chip>
                    </Tooltip>
                );
            })}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Service Clients tab
// ──────────────────────────────────────────────────────────────────────────
function ClientsTab({
    clients,
    scopesData,
    onChange,
}: {
    clients: ClientApp[];
    scopesData: ScopesPayload;
    onChange: () => void;
}) {
    const t = useTranslations();
    const [createOpen, setCreateOpen] = useState(false);
    const [mintFor, setMintFor] = useState<ClientApp | null>(null);
    const [revealedKey, setRevealedKey] = useState<{
        clientId: string;
        signingKey: string;
        version: number;
        notice: string;
    } | null>(null);
    const [revealedJwt, setRevealedJwt] = useState<{
        clientId: string;
        token: string;
        audiences: string[];
        expiresIn: string;
        notice: string;
    } | null>(null);

    const rotate = async (clientId: string) => {
        if (!confirm(t('apiKeys.clients.confirmRotate', { clientId }))) return;
        const res = await fetch(`/api/admin/clients/${clientId}/rotate-key`, {
            method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
            addToast({
                title: t('apiKeys.clients.toast.rotationFailedTitle'),
                description: data.error ?? res.statusText,
                color: "danger",
            });
            return;
        }
        setRevealedKey({
            clientId: data.clientId,
            signingKey: data.signingKey,
            version: data.signingKeyVersion,
            notice: t('apiKeys.clients.rotateNotice'),
        });
        onChange();
    };

    return (
        <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <p className="text-default-600 text-sm flex-1">
                    {t.rich('apiKeys.clients.intro', {
                        code: (chunks) => <code>{chunks}</code>,
                    })}
                </p>
                <Button variant="bordered" color="primary" onPress={() => setCreateOpen(true)} className="shrink-0" startContent={<Icons.plus className="size-4" />}>
                    {t('apiKeys.clients.newClientButton')}
                </Button>
            </div>

            {revealedKey && (
                <RevealedSecret
                    title={t('apiKeys.clients.revealedKeyTitle', { clientId: revealedKey.clientId, version: revealedKey.version })}
                    value={revealedKey.signingKey}
                    notice={revealedKey.notice}
                    onClose={() => setRevealedKey(null)}
                />
            )}

            {revealedJwt && (
                <RevealedSecret
                    title={t('apiKeys.clients.revealedJwtTitle', {
                        clientId: revealedJwt.clientId,
                        audiences: revealedJwt.audiences.join(", "),
                        expiresIn: revealedJwt.expiresIn,
                    })}
                    value={revealedJwt.token}
                    notice={revealedJwt.notice}
                    onClose={() => setRevealedJwt(null)}
                />
            )}

            {clients.length === 0 ? (
                <p className="text-default-400 text-sm text-center py-8">{t('apiKeys.clients.empty')}</p>
            ) : (
                <div className="space-y-3">
                    {clients.map(c => (
                        <Card key={c.id} shadow="sm" className="border border-default-200">
                            <CardHeader className="flex flex-wrap items-start justify-between gap-2 pb-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Code size="sm">{c.clientId}</Code>
                                    <Chip radius="sm" size="sm" color={c.active ? "success" : "default"} variant="flat">
                                        {c.active ? t('apiKeys.clients.statusActive') : t('apiKeys.clients.statusInactive')}
                                    </Chip>
                                    <span className="text-xs text-default-400">v{c.signingKeyVersion}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="bordered" color="primary" onPress={() => setMintFor(c)} startContent={<Icons.key className="size-4" />}>
                                        {t('apiKeys.clients.mintJwtButton')}
                                    </Button>
                                    <Button size="sm" variant="bordered" color="warning" onPress={() => rotate(c.clientId)} startContent={<Icons.refresh className="size-4" />}>
                                        {t('apiKeys.clients.rotateButton')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardBody className="pt-1 space-y-2">
                                <div>
                                    <p className="font-medium text-sm">{c.name}</p>
                                    {c.description && (
                                        <p className="text-xs text-default-500">{c.description}</p>
                                    )}
                                </div>
                                <ScopeChips scopes={c.scopes} catalog={scopesData.scopes} />
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <CreateClientDrawer
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                scopesData={scopesData}
                onCreated={(payload) => {
                    setRevealedKey({
                        clientId: payload.client.clientId,
                        signingKey: payload.signingKey,
                        version: payload.client.signingKeyVersion,
                        notice: payload.notice,
                    });
                    onChange();
                }}
            />

            <MintPlatformJwtDrawer
                client={mintFor}
                onClose={() => setMintFor(null)}
                onMinted={(payload) => {
                    setRevealedJwt(payload);
                    setMintFor(null);
                }}
            />
        </div>
    );
}

function CreateClientDrawer({
    open,
    onClose,
    scopesData,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    scopesData: ScopesPayload;
    onCreated: (payload: {
        client: ClientApp;
        signingKey: string;
        notice: string;
    }) => void;
}) {
    const t = useTranslations();
    const [clientId, setClientId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [callbackUrls, setCallbackUrls] = useState("");
    const [domains, setDomains] = useState("");
    const [presetId, setPresetId] = useState("");
    const [scopes, setScopes] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setClientId("");
        setName("");
        setDescription("");
        setCallbackUrls("");
        setDomains("");
        setPresetId("");
        setScopes(new Set());
    };

    const applyPreset = (id: string) => {
        setPresetId(id);
        const p = scopesData.presets.find(x => x.id === id);
        if (p) setScopes(new Set(p.scopes));
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    name,
                    description: description || undefined,
                    allowedCallbackUrls: splitLines(callbackUrls),
                    allowedDomains: splitLines(domains),
                    scopes: Array.from(scopes),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                addToast({
                    title: t('apiKeys.createClient.toast.createFailedTitle'),
                    description: data.error ?? res.statusText,
                    color: "danger",
                });
                return;
            }
            onCreated(data);
            reset();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Panel
            isOpen={open}
            onClose={onClose}
            size="xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">{t('apiKeys.createClient.title')}</h3>
                    <p className="text-default-500 text-sm">
                        {t.rich('apiKeys.createClient.subtitle', {
                            code: (chunks) => <code>{chunks}</code>,
                        })}
                    </p>
                </ModalHeader>
                <ModalBody className="px-4 pb-4 space-y-4">
                    <Select
                        label={t('apiKeys.createClient.presetLabel')}
                        placeholder={t('apiKeys.createClient.presetPlaceholder')}
                        selectedKeys={presetId ? [presetId] : []}
                        onChange={e => applyPreset(e.target.value)}
                    >
                        {scopesData.presets.map(p => (
                            <SelectItem key={p.id} description={p.description}>
                                {p.label}
                            </SelectItem>
                        ))}
                    </Select>

                    <Input
                        label={t('apiKeys.createClient.clientIdLabel')}
                        placeholder={t('apiKeys.createClient.clientIdPlaceholder')}
                        description={t('apiKeys.createClient.clientIdDescription')}
                        value={clientId}
                        onValueChange={setClientId}
                        isRequired
                    />
                    <Input
                        label={t('apiKeys.createClient.nameLabel')}
                        placeholder={t('apiKeys.createClient.namePlaceholder')}
                        value={name}
                        onValueChange={setName}
                        isRequired
                    />
                    <Input
                        label={t('apiKeys.createClient.descriptionLabel')}
                        value={description}
                        onValueChange={setDescription}
                    />
                    <Input
                        label={t('apiKeys.createClient.callbackUrlsLabel')}
                        placeholder={t('apiKeys.createClient.callbackUrlsPlaceholder')}
                        description={t('apiKeys.createClient.callbackUrlsDescription')}
                        value={callbackUrls}
                        onValueChange={setCallbackUrls}
                    />
                    <Input
                        label={t('apiKeys.createClient.domainsLabel')}
                        placeholder={t('apiKeys.createClient.domainsPlaceholder')}
                        description={t('apiKeys.createClient.domainsDescription')}
                        value={domains}
                        onValueChange={setDomains}
                    />

                    <Divider />

                    <ScopeSelector
                        catalog={scopesData.scopes}
                        selected={scopes}
                        onChange={setScopes}
                    />
                </ModalBody>
                <ModalFooter className="px-4 pb-4 flex gap-2">
                    <Button
                        variant="bordered"
                        className="flex-1"
                        startContent={<Icons.close className="size-4" />}
                        onPress={() => {
                            reset();
                            onClose();
                        }}
                    >
                        {t('apiKeys.createClient.cancelButton')}
                    </Button>
                    <Button
                        variant="bordered"
                        color="primary"
                        className="flex-1"
                        isLoading={submitting}
                        isDisabled={!clientId || !name}
                        startContent={<Icons.plus className="size-4" />}
                        onPress={submit}
                    >
                        {t('apiKeys.createClient.createButton')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Panel>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Mint Platform JWT drawer
// ──────────────────────────────────────────────────────────────────────────
interface MintedJwt {
    clientId: string;
    token: string;
    audiences: string[];
    expiresIn: string;
    notice: string;
}

function MintPlatformJwtDrawer({
    client,
    onClose,
    onMinted,
}: {
    client: ClientApp | null;
    onClose: () => void;
    onMinted: (payload: MintedJwt) => void;
}) {
    const t = useTranslations();
    const [expiresIn, setExpiresIn] = useState("30d");
    const [extraAudiences, setExtraAudiences] = useState("qb-back\nqb-notify");
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!client) return;
        setSubmitting(true);
        try {
            const res = await fetch(
                `/api/admin/clients/${client.clientId}/mint-platform-jwt`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        expiresIn,
                        extraAudiences: splitLines(extraAudiences),
                    }),
                },
            );
            const data = await res.json();
            if (!res.ok) {
                addToast({
                    title: t('apiKeys.mintJwt.toast.mintFailedTitle'),
                    description: data.error ?? res.statusText,
                    color: "danger",
                });
                return;
            }
            onMinted(data as MintedJwt);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Panel
            isOpen={!!client}
            onClose={onClose}
            size="xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">
                        {client ? t('apiKeys.mintJwt.titleFor', { clientId: client.clientId }) : t('apiKeys.mintJwt.titleBase')}
                    </h3>
                    <p className="text-default-500 text-sm">
                        {t.rich('apiKeys.mintJwt.subtitle', {
                            code: (chunks) => <code>{chunks}</code>,
                        })}
                    </p>
                </ModalHeader>
                <ModalBody className="px-4 pb-4 space-y-4">
                    <Alert
                        color="primary"
                        variant="flat"
                        title={t('apiKeys.mintJwt.alertTitle')}
                        description={t('apiKeys.mintJwt.alertDescription')}
                    />
                    <Input
                        label={t('apiKeys.mintJwt.expiresInLabel')}
                        description={t('apiKeys.mintJwt.expiresInDescription')}
                        value={expiresIn}
                        onValueChange={setExpiresIn}
                    />
                    <Input
                        label={t('apiKeys.mintJwt.audiencesLabel')}
                        description={t('apiKeys.mintJwt.audiencesDescription')}
                        value={extraAudiences}
                        onValueChange={setExtraAudiences}
                    />
                    {client && (
                        <div className="text-xs text-default-500 space-y-1">
                            <div>
                                <strong>{t('apiKeys.mintJwt.embeddedScopesLabel')}</strong>{" "}
                                {client.scopes.join(", ") || t('apiKeys.mintJwt.noneFallback')}
                            </div>
                            <div>
                                <strong>{t('apiKeys.mintJwt.revokeLabel')}</strong>{" "}
                                {t('apiKeys.mintJwt.revokeText')}
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter className="px-4 pb-4 flex gap-2">
                    <Button
                        variant="bordered"
                        className="flex-1"
                        startContent={<Icons.close className="size-4" />}
                        onPress={onClose}
                    >
                        {t('apiKeys.mintJwt.cancelButton')}
                    </Button>
                    <Button
                        variant="bordered"
                        color="primary"
                        className="flex-1"
                        isLoading={submitting}
                        startContent={<Icons.key className="size-4" />}
                        onPress={submit}
                    >
                        {t('apiKeys.mintJwt.mintButton')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Panel>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// API Keys tab
// ──────────────────────────────────────────────────────────────────────────
function ApiKeysTab({
    apiKeys,
    clients,
    scopesData,
    onChange,
}: {
    apiKeys: ApiKey[];
    clients: ClientApp[];
    scopesData: ScopesPayload;
    onChange: () => void;
}) {
    const t = useTranslations();
    const [createOpen, setCreateOpen] = useState(false);
    const [revealedKey, setRevealedKey] = useState<{
        name: string;
        token: string;
        notice: string;
    } | null>(null);

    const revoke = async (id: string, name: string) => {
        if (!confirm(t('apiKeys.apiKeysTab.confirmRevoke', { name }))) return;
        const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
        if (!res.ok) {
            addToast({ title: t('apiKeys.apiKeysTab.toast.revokeFailedTitle'), color: "danger" });
            return;
        }
        addToast({ title: t('apiKeys.apiKeysTab.toast.revokedTitle'), color: "success" });
        onChange();
    };

    return (
        <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <p className="text-default-600 text-sm flex-1">
                    {t.rich('apiKeys.apiKeysTab.intro', {
                        code: (chunks) => <code>{chunks}</code>,
                    })}
                </p>
                <Button variant="bordered" color="primary" onPress={() => setCreateOpen(true)} className="shrink-0" startContent={<Icons.plus className="size-4" />}>
                    {t('apiKeys.apiKeysTab.newButton')}
                </Button>
            </div>

            {revealedKey && (
                <RevealedSecret
                    title={t('apiKeys.apiKeysTab.revealedTitle', { name: revealedKey.name })}
                    value={revealedKey.token}
                    notice={revealedKey.notice}
                    onClose={() => setRevealedKey(null)}
                />
            )}

            {apiKeys.length === 0 ? (
                <p className="text-default-400 text-sm text-center py-8">{t('apiKeys.apiKeysTab.empty')}</p>
            ) : (
                <div className="space-y-3">
                    {apiKeys.map(k => {
                        const client = clients.find(c => c.id === k.clientAppId);
                        return (
                            <Card key={k.id} shadow="sm" className="border border-default-200">
                                <CardHeader className="flex flex-wrap items-start justify-between gap-2 pb-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Code size="sm">{k.prefix}</Code>
                                        {k.revokedAt ? (
                                            <Chip radius="sm" size="sm" color="danger" variant="flat">{t('apiKeys.apiKeysTab.statusRevoked')}</Chip>
                                        ) : (
                                            <Chip radius="sm" size="sm" color="success" variant="flat">{t('apiKeys.apiKeysTab.statusActive')}</Chip>
                                        )}
                                    </div>
                                    {!k.revokedAt && (
                                        <Button size="sm" variant="bordered" color="danger" onPress={() => revoke(k.id, k.name)} startContent={<Icons.ban className="size-4" />}>
                                            {t('apiKeys.apiKeysTab.revokeButton')}
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardBody className="pt-1 space-y-2">
                                    <p className="font-medium text-sm">{k.name}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-default-500">
                                        {client ? (
                                            <Chip radius="sm" size="sm" variant="flat" color="primary">{client.clientId}</Chip>
                                        ) : k.userId ? (
                                            <Chip radius="sm" size="sm" variant="flat" color="secondary">{t('apiKeys.apiKeysTab.userChip')}</Chip>
                                        ) : (
                                            <span className="italic">{t('apiKeys.apiKeysTab.standaloneLabel')}</span>
                                        )}
                                        <span>{t('apiKeys.apiKeysTab.lastUsedLabel')} {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</span>
                                        <span>{t('apiKeys.apiKeysTab.expiresLabel')} {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : t('apiKeys.apiKeysTab.neverLabel')}</span>
                                    </div>
                                    <ScopeChips scopes={k.scopes} catalog={scopesData.scopes} />
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}

            <CreateApiKeyDrawer
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                clients={clients}
                scopesData={scopesData}
                onCreated={payload => {
                    setRevealedKey({
                        name: payload.name,
                        token: payload.key,
                        notice: payload.notice,
                    });
                    onChange();
                }}
            />
        </div>
    );
}

function CreateApiKeyDrawer({
    open,
    onClose,
    clients,
    scopesData,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    clients: ClientApp[];
    scopesData: ScopesPayload;
    onCreated: (payload: {
        name: string;
        key: string;
        notice: string;
    }) => void;
}) {
    const t = useTranslations();
    const [name, setName] = useState("");
    const [clientAppId, setClientAppId] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [scopes, setScopes] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    const reset = () => {
        setName("");
        setClientAppId("");
        setExpiresAt("");
        setScopes(new Set());
    };

    // When a client is selected, default its scopes
    const onClientChange = (id: string) => {
        setClientAppId(id);
        const c = clients.find(x => x.id === id);
        if (c) setScopes(new Set(c.scopes));
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    clientAppId: clientAppId || undefined,
                    scopes: Array.from(scopes),
                    expiresAt: expiresAt
                        ? new Date(expiresAt).toISOString()
                        : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                addToast({
                    title: t('apiKeys.createApiKey.toast.createFailedTitle'),
                    description: data.error ?? res.statusText,
                    color: "danger",
                });
                return;
            }
            onCreated({
                name: data.name ?? name,
                key: data.key,
                notice: data.notice,
            });
            reset();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Panel isOpen={open} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold">{t('apiKeys.createApiKey.title')}</h3>
                    <p className="text-default-500 text-sm">
                        {t('apiKeys.createApiKey.subtitle')}
                    </p>
                </ModalHeader>
                <ModalBody className="px-4 pb-4 space-y-4">
                    <Input
                        label={t('apiKeys.createApiKey.nameLabel')}
                        placeholder={t('apiKeys.createApiKey.namePlaceholder')}
                        value={name}
                        onValueChange={setName}
                        isRequired
                    />
                    <Select
                        label={t('apiKeys.createApiKey.boundClientLabel')}
                        placeholder={t('apiKeys.createApiKey.standalonePlaceholder')}
                        selectedKeys={clientAppId ? [clientAppId] : []}
                        onChange={e => onClientChange(e.target.value)}
                    >
                        {clients.map(c => (
                            <SelectItem key={c.id} description={c.name}>
                                {c.clientId}
                            </SelectItem>
                        ))}
                    </Select>
                    <Input
                        type="datetime-local"
                        label={t('apiKeys.createApiKey.expiresAtLabel')}
                        value={expiresAt}
                        onValueChange={setExpiresAt}
                    />
                    <Divider />
                    <ScopeSelector
                        catalog={scopesData.scopes}
                        selected={scopes}
                        onChange={setScopes}
                    />
                </ModalBody>
                <ModalFooter className="px-4 pb-4 flex gap-2">
                    <Button
                        variant="bordered"
                        className="flex-1"
                        startContent={<Icons.close className="size-4" />}
                        onPress={() => {
                            reset();
                            onClose();
                        }}
                    >
                        {t('apiKeys.createApiKey.cancelButton')}
                    </Button>
                    <Button
                        variant="bordered"
                        color="primary"
                        className="flex-1"
                        isLoading={submitting}
                        isDisabled={!name}
                        startContent={<Icons.plus className="size-4" />}
                        onPress={submit}
                    >
                        {t('apiKeys.createApiKey.createButton')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Panel>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Scope catalog tab
// ──────────────────────────────────────────────────────────────────────────
function ScopeCatalogTab({ scopesData }: { scopesData: ScopesPayload }) {
    const t = useTranslations();
    const [query, setQuery] = useState("");

    const grouped = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? scopesData.scopes.filter(
                  s =>
                      s.id.includes(q) ||
                      s.label.toLowerCase().includes(q) ||
                      s.description.toLowerCase().includes(q),
              )
            : scopesData.scopes;
        const map = new Map<string, ScopeDefinition[]>();
        for (const s of filtered) {
            if (!map.has(s.category)) map.set(s.category, []);
            map.get(s.category)!.push(s);
        }
        return Array.from(map.entries());
    }, [scopesData.scopes, query]);

    return (
        <div className="space-y-4 py-4">
            <Alert
                color="default"
                variant="flat"
                title={t('apiKeys.scopeCatalog.alertTitle')}
                description={t('apiKeys.scopeCatalog.alertDescription')}
            />
            <Input
                placeholder={t('apiKeys.scopeCatalog.searchPlaceholder')}
                value={query}
                onValueChange={setQuery}
                isClearable
                onClear={() => setQuery("")}
            />

            {grouped.map(([category, scopes]) => (
                <Card key={category}>
                    <CardHeader>
                        <h3 className="font-semibold capitalize">
                            {category.replace("-", " ")}
                        </h3>
                    </CardHeader>
                    <CardBody className="space-y-2 p-2 sm:p-3">
                        {scopes.map(s => (
                            <div key={s.id} className="border border-default-100 rounded-sm p-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Code size="sm">{s.id}</Code>
                                    <Chip radius="sm" size="sm" variant="flat" color={RISK_COLOR[s.risk]}>
                                        {t(`apiKeys.risk.${s.risk}`)}
                                    </Chip>
                                </div>
                                <p className="text-xs text-default-500">{s.label}</p>
                                <p className="text-sm text-default-700">{s.description}</p>
                                {s.endpoints.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {s.endpoints.map(e => (
                                            <Code key={e} size="sm" className="text-xs">{e}</Code>
                                        ))}
                                    </div>
                                )}
                                {(s.suggestedFor ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {(s.suggestedFor ?? []).map(svc => (
                                            <Chip radius="sm" key={svc} size="sm" variant="flat">{svc}</Chip>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardBody>
                </Card>
            ))}

            <Card>
                <CardHeader>
                    <h3 className="font-semibold">{t('apiKeys.scopeCatalog.presetsTitle')}</h3>
                </CardHeader>
                <CardBody className="space-y-3">
                    {scopesData.presets.map(p => (
                        <div
                            key={p.id}
                            className="border border-default-200 rounded-sm p-3"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium">{p.label}</h4>
                                <Chip radius="sm" size="sm" variant="flat">
                                    {p.targetService}
                                </Chip>
                            </div>
                            <p className="text-sm text-default-600 mb-2">
                                {p.description}
                            </p>
                            <ScopeChips
                                scopes={p.scopes}
                                catalog={scopesData.scopes}
                            />
                        </div>
                    ))}
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h3 className="font-semibold">{t('apiKeys.scopeCatalog.rolesTitle')}</h3>
                </CardHeader>
                <CardBody className="space-y-2">
                    {Object.entries(scopesData.roles).map(([role, scopes]) => (
                        <div key={role} className="flex items-start gap-3">
                            <Chip radius="sm" size="sm" variant="solid" color="primary">
                                {role}
                            </Chip>
                            <ScopeChips
                                scopes={scopes}
                                catalog={scopesData.scopes}
                            />
                        </div>
                    ))}
                </CardBody>
            </Card>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Scope multi-selector (used by both create drawers)
// ──────────────────────────────────────────────────────────────────────────
function ScopeSelector({
    catalog,
    selected,
    onChange,
}: {
    catalog: ScopeDefinition[];
    selected: Set<string>;
    onChange: (s: Set<string>) => void;
}) {
    const t = useTranslations();
    const grouped = useMemo(() => {
        const m = new Map<string, ScopeDefinition[]>();
        for (const s of catalog) {
            if (!m.has(s.category)) m.set(s.category, []);
            m.get(s.category)!.push(s);
        }
        return Array.from(m.entries());
    }, [catalog]);

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('apiKeys.scopeSelector.label')}</label>
                <span className="text-xs text-default-500">
                    {t('apiKeys.scopeSelector.selectedCount', { count: selected.size })}
                </span>
            </div>
            <Accordion variant="splitted" selectionMode="multiple" isCompact>
                {grouped.map(([cat, items]) => (
                    <AccordionItem
                        key={cat}
                        aria-label={cat}
                        title={
                            <div className="flex items-center gap-2">
                                <span className="capitalize">
                                    {cat.replace("-", " ")}
                                </span>
                                <span className="text-xs text-default-400">
                                    (
                                    {items.filter(s => selected.has(s.id)).length}/
                                    {items.length})
                                </span>
                            </div>
                        }
                    >
                        <div className="space-y-2">
                            {items.map(s => (
                                <label
                                    key={s.id}
                                    className="flex items-start gap-3 cursor-pointer rounded-sm p-2 hover:bg-default-100"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={selected.has(s.id)}
                                        onChange={() => toggle(s.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Code size="sm">{s.id}</Code>
                                            <Chip radius="sm"
                                                size="sm"
                                                variant="flat"
                                                color={RISK_COLOR[s.risk]}
                                            >
                                                {t(`apiKeys.risk.${s.risk}`)}
                                            </Chip>
                                        </div>
                                        <p className="text-xs text-default-600 mt-1">
                                            {s.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Reveal-once secret box
// ──────────────────────────────────────────────────────────────────────────
function RevealedSecret({
    title,
    value,
    notice,
    onClose,
}: {
    title: string;
    value: string;
    notice: string;
    onClose: () => void;
}) {
    const t = useTranslations();
    return (
        <Alert
            color="warning"
            variant="faded"
            title={title}
            description={
                <div className="space-y-3 mt-2">
                    <p className="text-sm">{notice}</p>
                    <Snippet
                        symbol=""
                        variant="flat"
                        className="w-full"
                        classNames={{ pre: "whitespace-pre-wrap break-all text-xs" }}
                    >
                        {value}
                    </Snippet>
                    <Button size="sm" variant="bordered" startContent={<Icons.close className="size-4" />} onPress={onClose}>
                        {t('apiKeys.revealedSecret.dismissButton')}
                    </Button>
                </div>
            }
        />
    );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
function splitLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);
}
