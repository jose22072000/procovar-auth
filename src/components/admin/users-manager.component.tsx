"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  Avatar, Button, Chip, Input, Spinner, Switch, Tooltip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, addToast,
} from "@heroui/react";
import {
  toggleUserAdmin, toggleEmailVerified, adminDeleteUser, updateUserProfile,
  listUserSessions, revokeUserSession, revokeAllUserSessions,
} from "@/app/(user)/dashboard/_actions";
import { useTranslations } from "next-intl";
import { aplicacionDeSesion, desdeDonde } from "@/lib/desde-donde";

interface UserSubscription { planKey: string; planName: string; status: string; currentPeriodEnd: string }
interface UserOrg { name: string; slug: string; roles: string[] }
interface UserRow {
  id: string; name: string; email: string; emailVerified: boolean; image: string | null;
  isSystemAdmin: boolean; phone: string | null; nationality: string | null; address: string | null;
  passportId: string | null; createdAt: string; orgCount: number; sessionCount: number;
  subscription: UserSubscription | null; orgs: UserOrg[];
}
interface SessionRow { id: string; ipAddress: string | null; userAgent: string | null; clientId: string | null; createdAt: string; expiresAt: string; revokedAt: string | null }

export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const editModal = useDisclosure();
  const detailModal = useDisclosure();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", nationality: "", address: "", passportId: "" });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialUsers;
    return initialUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [initialUsers, query]);

  const adminCount = useMemo(() => initialUsers.filter((u) => u.isSystemAdmin).length, [initialUsers]);

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return false; }
    addToast({ title: okMsg, color: "success" });
    router.refresh();
    return true;
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, phone: u.phone ?? "", nationality: u.nationality ?? "", address: u.address ?? "", passportId: u.passportId ?? "" });
    editModal.onOpen();
  }
  async function saveEdit() {
    if (!editing) return;
    const ok = await run(() => updateUserProfile(editing.id, {
      name: form.name, phone: form.phone || null, nationality: form.nationality || null,
      address: form.address || null, passportId: form.passportId || null,
    }), t('dashboard.usersManager.profileUpdated'));
    if (ok) editModal.onClose();
  }

  async function openDetail(u: UserRow) {
    setDetail(u); setSessions([]); setLoadingSessions(true); detailModal.onOpen();
    const res = await listUserSessions(u.id);
    setLoadingSessions(false);
    if (res.error) addToast({ title: res.error, color: "danger" });
    else setSessions(res.sessions ?? []);
  }
  async function reloadSessions(userId: string) {
    const r = await listUserSessions(userId);
    if (r.sessions) setSessions(r.sessions);
  }

  async function del(u: UserRow) {
    if (!confirm(t('dashboard.usersManager.confirmDeleteUser', { email: u.email }))) return;
    await run(() => adminDeleteUser(u.id), t('dashboard.usersManager.userDeleted'));
  }

  const activeSessions = sessions.filter((s) => !s.revokedAt).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Input
          className="max-w-xs" variant="bordered" label={t('dashboard.usersManager.searchUserLabel')} labelPlacement="outside"
          placeholder={t('dashboard.usersManager.searchUserPlaceholder')} value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")}
          startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
        />
        <div className="flex items-center gap-2 pb-1 text-xs text-slate-400">
          <Chip size="sm" variant="flat" startContent={<Icon icon="lucide:users" className="ml-1 size-3.5" aria-hidden />}>
            {t('dashboard.usersManager.usersCount', { count: initialUsers.length })}
          </Chip>
          <Chip size="sm" variant="flat" color="primary" startContent={<Icon icon="lucide:shield" className="ml-1 size-3.5" aria-hidden />}>
            {t('dashboard.usersManager.adminCount', { count: adminCount })}
          </Chip>
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Table aria-label={t('dashboard.usersManager.tableAriaLabel')} removeWrapper classNames={{ th: "bg-transparent" }}>
          <TableHeader>
            <TableColumn>{t('dashboard.usersManager.colUser')}</TableColumn>
            <TableColumn>{t('dashboard.usersManager.colEmail')}</TableColumn>
            <TableColumn>{t('dashboard.usersManager.colAdmin')}</TableColumn>
            <TableColumn>{t('dashboard.usersManager.colOrgs')}</TableColumn>
            <TableColumn align="end">{t('dashboard.usersManager.colActions')}</TableColumn>
          </TableHeader>
          <TableBody emptyContent={query ? t('dashboard.usersManager.noUsersMatch') : t('dashboard.usersManager.noUsers')}>
            {filtered.map((u) => (
              <TableRow key={u.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" name={u.name} src={u.image ?? undefined} imgProps={{ referrerPolicy: "no-referrer" }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                        {u.isSystemAdmin && (
                          <Tooltip content={t('dashboard.usersManager.systemAdminTooltip')}>
                            <span className="inline-flex"><Icon icon="lucide:shield-check" className="size-3.5 text-[#0A2252] dark:text-sky-400" aria-hidden /></span>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{t('dashboard.usersManager.joinedOn', { date: new Date(u.createdAt).toLocaleDateString() })}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300">{u.email}</span>
                    <Chip
                      size="sm" variant="flat" color={u.emailVerified ? "success" : "warning"}
                      startContent={<Icon icon={u.emailVerified ? "lucide:badge-check" : "lucide:mail-warning"} className="ml-1 size-3.5" aria-hidden />}
                    >
                      {u.emailVerified ? t('dashboard.usersManager.verified') : t('dashboard.usersManager.unverified')}
                    </Chip>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch size="sm" isSelected={u.isSystemAdmin} isDisabled={busy}
                    onValueChange={(v) => run(() => toggleUserAdmin(u.id, v), t('dashboard.usersManager.permissionsUpdated'))} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Icon icon="lucide:building-2" className="size-4" aria-hidden />
                    {u.orgCount}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-0.5">
                    <Tooltip content={t('dashboard.usersManager.viewDetailTooltip')}>
                      <Button isIconOnly size="sm" variant="light" aria-label={t('dashboard.usersManager.detailAriaLabel')} onPress={() => openDetail(u)}>
                        <Icon icon="lucide:eye" className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('dashboard.usersManager.editProfileTooltip')}>
                      <Button isIconOnly size="sm" variant="light" aria-label={t('dashboard.usersManager.editAriaLabel')} onPress={() => openEdit(u)}>
                        <Icon icon="lucide:pencil" className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                    <Tooltip content={u.emailVerified ? t('dashboard.usersManager.markUnverified') : t('dashboard.usersManager.markVerified')}>
                      <Button isIconOnly size="sm" variant="light" color="warning" aria-label={t('dashboard.usersManager.verifyAriaLabel')} isDisabled={busy}
                        onPress={() => run(() => toggleEmailVerified(u.id, !u.emailVerified), t('dashboard.usersManager.emailUpdated'))}>
                        <Icon icon={u.emailVerified ? "lucide:mail-x" : "lucide:mail-check"} className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('dashboard.usersManager.deleteUserTooltip')} color="danger">
                      <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t('dashboard.usersManager.deleteAriaLabel')} isDisabled={busy} onPress={() => del(u)}>
                        <Icon icon="lucide:trash-2" className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit profile */}
      <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Avatar size="sm" name={editing?.name} src={editing?.image ?? undefined} imgProps={{ referrerPolicy: "no-referrer" }} />
              <div>
                <p>{t('dashboard.usersManager.editProfileTitle')}</p>
                {editing && <p className="text-xs font-normal text-slate-400">{editing.email}</p>}
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="gap-3">
            <Input label={t('dashboard.usersManager.nameLabel')} variant="bordered" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Input label={t('dashboard.usersManager.phoneLabel')} variant="bordered" value={form.phone} onValueChange={(v) => setForm((f) => ({ ...f, phone: v }))} startContent={<Icon icon="lucide:phone" className="size-4 text-slate-400" aria-hidden />} />
            <Input label={t('dashboard.usersManager.nationalityLabel')} variant="bordered" value={form.nationality} onValueChange={(v) => setForm((f) => ({ ...f, nationality: v }))} />
            <Input label={t('dashboard.usersManager.addressLabel')} variant="bordered" value={form.address} onValueChange={(v) => setForm((f) => ({ ...f, address: v }))} startContent={<Icon icon="lucide:map-pin" className="size-4 text-slate-400" aria-hidden />} />
            <Input label={t('dashboard.usersManager.passportLabel')} variant="bordered" value={form.passportId} onValueChange={(v) => setForm((f) => ({ ...f, passportId: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={editModal.onClose}>{t('dashboard.common.cancel')}</Button>
            <Button variant="bordered" color="primary" isLoading={busy} startContent={<Icon icon="lucide:save" className="size-4" aria-hidden />} onPress={saveEdit}>{t('dashboard.common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detail: subscription / orgs / sessions */}
      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-3">
              <Avatar size="sm" name={detail?.name} src={detail?.image ?? undefined} imgProps={{ referrerPolicy: "no-referrer" }} />
              <div>
                <p>{detail ? detail.name : t('dashboard.usersManager.detailTitle')}</p>
                {detail && <p className="text-xs font-normal text-slate-400">{detail.email}</p>}
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="gap-5">
            {/* Las sucursales de esta persona y el rol que tiene en cada una.
                Aquí había además un bloque de "Suscripción" con planes de pago:
                era del producto del que salió este código. Procovar no cobra
                suscripciones a su propia gente. */}
            <section>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Icon icon="lucide:building-2" className="size-4" aria-hidden /> {t('dashboard.usersManager.organizationsSection')}
              </p>
              {detail && detail.orgs.length ? (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-slate-700/60 dark:border-slate-700">
                  {detail.orgs.map((o) => (
                    <div key={o.slug} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <Avatar name={o.name} radius="sm" size="sm" className="shrink-0" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{o.name}</span>
                      <span className="text-slate-400">@{o.slug}</span>
                      <div className="ml-auto flex flex-wrap gap-1">
                        {o.roles.map((r) => <Chip key={r} size="sm" variant="flat">{r}</Chip>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-slate-400 dark:border-slate-700">{t('dashboard.usersManager.noOrganizations')}</p>}
            </section>

            {/* Sessions */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <Icon icon="lucide:monitor-smartphone" className="size-4" aria-hidden /> {t('dashboard.usersManager.sessionsSection')}
                  {!loadingSessions && sessions.length > 0 && <span className="text-xs font-normal text-slate-400">{t('dashboard.usersManager.activeSessionsCount', { count: activeSessions })}</span>}
                </p>
                <Button size="sm" color="danger" variant="bordered" isDisabled={!detail || busy || activeSessions === 0}
                  startContent={<Icon icon="lucide:log-out" className="size-4" aria-hidden />}
                  onPress={async () => { if (detail && await run(() => revokeAllUserSessions(detail.id), t('dashboard.usersManager.sessionsRevoked'))) reloadSessions(detail.id); }}>
                  {t('dashboard.usersManager.revokeAll')}
                </Button>
              </div>
              {loadingSessions ? (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-8 text-sm text-slate-400 dark:border-slate-700">
                  <Spinner size="sm" /> {t('dashboard.usersManager.loadingSessions')}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 dark:border-slate-700">
                  <Table aria-label={t('dashboard.usersManager.sessionsTableAriaLabel')} removeWrapper classNames={{ th: "bg-transparent" }}>
                    <TableHeader>
                      <TableColumn>{t('dashboard.usersManager.colFrom')}</TableColumn>
                      <TableColumn>{t('dashboard.usersManager.colClient')}</TableColumn>
                      <TableColumn>{t('dashboard.usersManager.colCreated')}</TableColumn>
                      <TableColumn>{t('dashboard.usersManager.colStatus')}</TableColumn>
                      <TableColumn align="end"> </TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={t('dashboard.usersManager.noSessions')}>
                      {sessions.map((s) => (
                        <TableRow key={s.id}>
                          {/* Desde dónde se entró: el sitio (IP) y el aparato.
                              Un guion cuando no consta — mejor eso que un
                              "Desconocido" que parece un dato. */}
                          <TableCell>
                            {(() => {
                              const { ip, aparato } = desdeDonde(s.ipAddress, s.userAgent);
                              if (!ip && !aparato) return "—";
                              return (
                                <div className="leading-tight">
                                  {ip && <div className="pv-codigo">{ip}</div>}
                                  {aparato && <div className="text-xs text-pv-tinta-suave">{aparato}</div>}
                                </div>
                              );
                            })()}
                          </TableCell>
                          {/* La aplicación por la que entró; sin ella, entró aquí mismo. */}
                          <TableCell>{aplicacionDeSesion(s.clientId)}</TableCell>
                          <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat" color={s.revokedAt ? "default" : "success"}>
                              {s.revokedAt ? t('dashboard.usersManager.revokedStatus') : t('dashboard.usersManager.activeStatus')}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Tooltip content={s.revokedAt ? t('dashboard.usersManager.alreadyRevoked') : t('dashboard.usersManager.revokeSessionTooltip')} color={s.revokedAt ? "default" : "danger"}>
                                <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t('dashboard.usersManager.revokeAriaLabel')} isDisabled={!!s.revokedAt || busy}
                                  onPress={async () => { if (detail && await run(() => revokeUserSession(s.id), t('dashboard.usersManager.sessionRevoked'))) reloadSessions(detail.id); }}>
                                  <Icon icon="lucide:x" className="size-4" aria-hidden />
                                </Button>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={detailModal.onClose}>{t('dashboard.common.close')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
