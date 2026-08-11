"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  Avatar, Button, Chip, Input, Select, SelectItem, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, addToast,
} from "@heroui/react";
import { removeOrgMember, setOrgMemberRoles, updateOrganizationAdmin, deleteOrganizationAdmin, anadirPersona } from "@/app/(user)/dashboard/_actions";
import { useTranslations } from "next-intl";

interface RoleRow { id: string; name: string; color: string | null; icon: string | null; isSystem: boolean }
interface MemberRow { memberId: string; userId: string; name: string; email: string; legacyRole: string; roleIds: string[] }
interface OrgRow { id: string; name: string; slug: string; logo: string | null; memberCount: number; roles: RoleRow[]; members: MemberRow[] }

function RoleChip({ role }: { role: RoleRow }) {
  return (
    <Chip
      size="sm"
      variant="flat"
      startContent={<span className="ml-1 size-2 rounded-full" style={{ backgroundColor: role.color ?? "#94a3b8" }} aria-hidden />}
    >
      {role.name}
    </Chip>
  );
}

export function OrgsManager({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialOrgs[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const editOrg = useDisclosure();
  const delOrg = useDisclosure();
  const roleModal = useDisclosure();
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", logo: "" });
  const [delConfirm, setDelConfirm] = useState("");
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>([]);
  const alta = useDisclosure();
  const [altaForm, setAltaForm] = useState({ nombre: "", usuario: "", email: "", password: "", roleId: "" });

  const orgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialOrgs;
    return initialOrgs.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
  }, [initialOrgs, query]);
  const selected = initialOrgs.find((o) => o.id === selectedId) ?? null;

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return false; }
    addToast({ title: okMsg, color: "success" });
    router.refresh();
    return true;
  }

  function role(o: OrgRow, id: string): RoleRow { return o.roles.find((r) => r.id === id) ?? { id, name: id, color: null, icon: null, isSystem: false }; }
  function openEditOrg() { if (!selected) return; setOrgForm({ name: selected.name, slug: selected.slug, logo: selected.logo ?? "" }); editOrg.onOpen(); }
  function openDelOrg() { setDelConfirm(""); delOrg.onOpen(); }
  function openRoles(m: MemberRow) { setEditingMember(m); setMemberRoleIds(m.roleIds); roleModal.onOpen(); }

  function abrirAlta() {
    if (!selected) return;
    // El rol más limitado por defecto. Quien da de alta a diez personas seguidas
    // acaba dándole a Guardar sin mirar, y equivocarse hacia abajo se arregla
    // con un clic; hacia arriba, no se nota.
    const gestor = selected.roles.find((r) => r.name === "GESTOR");
    setAltaForm({ nombre: "", usuario: "", email: "", password: "", roleId: gestor?.id ?? selected.roles[0]?.id ?? "" });
    alta.onOpen();
  }

  async function guardarAlta() {
    if (!selected) return;
    setBusy(true);
    const res = await anadirPersona({ organizationId: selected.id, ...altaForm });
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return; }
    addToast({
      title: res.yaExistia
        ? t('dashboard.orgsManager.personLinked', { orgName: selected.name })
        : t('dashboard.orgsManager.personCreated'),
      color: "success",
    });
    alta.onClose();
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      {/* Org list */}
      <div className="space-y-3">
        <Input
          variant="bordered" label={t('dashboard.orgsManager.searchOrgLabel')} labelPlacement="outside" placeholder={t('dashboard.orgsManager.searchOrgPlaceholder')}
          value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")}
          startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
        />
        <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
          {orgs.map((o) => {
            const active = o.id === selectedId;
            return (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors " +
                  (active
                    ? "border-pv-azul/40 bg-pv-azul/8 dark:border-white/25 dark:bg-white/10"
                    : "border-gray-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800")
                }
              >
                <Avatar src={o.logo ?? undefined} name={o.name} radius="sm" size="sm" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900 dark:text-slate-100">{o.name}</div>
                  <div className="truncate text-xs text-slate-400">@{o.slug}</div>
                </div>
                <Chip size="sm" variant="flat" className="shrink-0">{o.memberCount}</Chip>
              </button>
            );
          })}
          {orgs.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
              {t('dashboard.orgsManager.noOrgsMatch')}
            </div>
          )}
        </div>
      </div>

      {/* Selected org detail */}
      {selected ? (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          {/* Detail header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar src={selected.logo ?? undefined} name={selected.name} radius="sm" size="lg" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selected.name}</h2>
                <p className="text-sm text-slate-400">@{selected.slug}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="bordered" startContent={<Icon icon="lucide:pencil" className="size-4" aria-hidden />} onPress={openEditOrg}>
                {t('dashboard.orgsManager.edit')}
              </Button>
              <Button size="sm" variant="bordered" color="danger" startContent={<Icon icon="lucide:trash-2" className="size-4" aria-hidden />} onPress={openDelOrg}>
                {t('dashboard.orgsManager.delete')}
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-3">
            <div className="rounded-lg bg-slate-50 px-4 py-2 dark:bg-slate-900/50">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{selected.members.length}</div>
              <div className="text-xs text-slate-400">{t('dashboard.orgsManager.membersLabel')}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-2 dark:bg-slate-900/50">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{selected.roles.length}</div>
              <div className="text-xs text-slate-400">{t('dashboard.orgsManager.rolesLabel')}</div>
            </div>
          </div>

          {/* Members */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('dashboard.orgsManager.membersLabel')}</p>
              <Button size="sm" color="primary" isDisabled={busy} onPress={abrirAlta}
                startContent={<Icon icon="lucide:user-plus" className="size-4" aria-hidden />}>
                {t('dashboard.orgsManager.addPerson')}
              </Button>
            </div>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-slate-700/60 dark:border-slate-700">
              {selected.members.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">{t('dashboard.orgsManager.noMembers')}</div>
              ) : selected.members.map((m) => (
                <div key={m.memberId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Avatar name={m.name} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900 dark:text-slate-100">{m.name}</div>
                    <div className="truncate text-xs text-slate-400">{m.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {m.roleIds.length ? m.roleIds.map((id) => <RoleChip key={id} role={role(selected, id)} />)
                      : <Chip size="sm" variant="flat" className="text-slate-400">{m.legacyRole}</Chip>}
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Tooltip content={t('dashboard.orgsManager.editRoles')}>
                      <Button isIconOnly size="sm" variant="light" aria-label={t('dashboard.orgsManager.editRoles')} onPress={() => openRoles(m)}>
                        <Icon icon="lucide:shield" className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t('dashboard.orgsManager.removeFromOrgTooltip')} color="danger">
                      <Button
                        isIconOnly size="sm" variant="light" color="danger" aria-label={t('dashboard.orgsManager.removeMemberAriaLabel')} isDisabled={busy}
                        onPress={() => { if (confirm(t('dashboard.orgsManager.confirmRemoveMember', { email: m.email, orgName: selected.name }))) run(() => removeOrgMember(m.memberId), t('dashboard.orgsManager.memberRemoved')); }}
                      >
                        <Icon icon="lucide:user-minus" className="size-4" aria-hidden />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 text-slate-400 dark:border-slate-700">
          <Icon icon="lucide:building-2" className="size-8" aria-hidden />
          <p className="text-sm">{t('dashboard.orgsManager.selectOrgPrompt')}</p>
        </div>
      )}

      {/* Alta de una persona en esta sucursal */}
      <Modal isOpen={alta.isOpen} onOpenChange={alta.onOpenChange} size="lg">
        <ModalContent>
          <ModalHeader className="flex-col items-start gap-0.5">
            <span>{t('dashboard.orgsManager.addPerson')}</span>
            <span className="text-sm font-normal text-slate-500">{selected?.name}</span>
          </ModalHeader>
          <ModalBody className="gap-3">
            <Input autoFocus label={t('dashboard.orgsManager.personName')} variant="bordered"
              value={altaForm.nombre} onValueChange={(v) => setAltaForm((f) => ({ ...f, nombre: v }))} />
            <Input label={t('dashboard.orgsManager.personUser')} variant="bordered"
              value={altaForm.usuario} onValueChange={(v) => setAltaForm((f) => ({ ...f, usuario: v }))}
              description={t('dashboard.orgsManager.personUserHelp')} />
            <Input label={t('dashboard.orgsManager.personEmail')} type="email" variant="bordered"
              value={altaForm.email} onValueChange={(v) => setAltaForm((f) => ({ ...f, email: v }))}
              description={t('dashboard.orgsManager.personEmailHelp')} />
            <Input label={t('dashboard.orgsManager.personPassword')} variant="bordered"
              value={altaForm.password} onValueChange={(v) => setAltaForm((f) => ({ ...f, password: v }))}
              description={t('dashboard.orgsManager.personPasswordHelp')} />
            <Select label={t('dashboard.orgsManager.personRole')} variant="bordered"
              selectedKeys={altaForm.roleId ? [altaForm.roleId] : []}
              onSelectionChange={(k) => setAltaForm((f) => ({ ...f, roleId: String([...k][0] ?? "") }))}>
              {(selected?.roles ?? []).map((r) => (
                <SelectItem key={r.id}>{r.name}</SelectItem>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={alta.onClose}
              startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />}>
              {t('dashboard.common.cancel')}
            </Button>
            <Button color="primary" isLoading={busy} onPress={guardarAlta}
              isDisabled={!altaForm.nombre.trim() || (!altaForm.usuario.trim() && !altaForm.email.trim()) || !altaForm.roleId}
              startContent={<Icon icon="lucide:user-plus" className="size-4" aria-hidden />}>
              {t('dashboard.orgsManager.addPerson')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit org */}
      <Modal isOpen={editOrg.isOpen} onOpenChange={editOrg.onOpenChange}>
        <ModalContent>
          <ModalHeader>{t('dashboard.orgsManager.editOrgTitle')}</ModalHeader>
          <ModalBody className="gap-3">
            <Input label={t('dashboard.orgsManager.nameLabel')} variant="bordered" value={orgForm.name} onValueChange={(v) => setOrgForm((f) => ({ ...f, name: v }))} />
            <Input label={t('dashboard.orgsManager.slugLabel')} variant="bordered" value={orgForm.slug} onValueChange={(v) => setOrgForm((f) => ({ ...f, slug: v }))} startContent={<span className="text-slate-400">@</span>} />
            <Input label={t('dashboard.orgsManager.logoLabel')} variant="bordered" value={orgForm.logo} onValueChange={(v) => setOrgForm((f) => ({ ...f, logo: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={editOrg.onClose}>{t('dashboard.common.cancel')}</Button>
            <Button variant="bordered" color="primary" isLoading={busy} startContent={<Icon icon="lucide:save" className="size-4" aria-hidden />}
              onPress={async () => { if (selected && await run(() => updateOrganizationAdmin(selected.id, { name: orgForm.name, slug: orgForm.slug, logo: orgForm.logo || null }), t('dashboard.orgsManager.orgUpdated'))) editOrg.onClose(); }}>
              {t('dashboard.common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete org (typed slug confirm) */}
      <Modal isOpen={delOrg.isOpen} onOpenChange={delOrg.onOpenChange}>
        <ModalContent>
          <ModalHeader className="text-danger">{t('dashboard.orgsManager.deleteOrgTitle')}</ModalHeader>
          <ModalBody className="gap-3">
            <p className="text-sm text-slate-500">{t('dashboard.orgsManager.deleteOrgWarningPrefix')} <b>{selected?.slug}</b> {t('dashboard.orgsManager.deleteOrgWarningSuffix')}</p>
            <Input variant="bordered" value={delConfirm} onValueChange={setDelConfirm} placeholder={selected?.slug} color="danger" />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={delOrg.onClose}>{t('dashboard.common.cancel')}</Button>
            <Button variant="bordered" color="danger" isLoading={busy} isDisabled={!selected || delConfirm !== selected.slug} startContent={<Icon icon="lucide:trash-2" className="size-4" aria-hidden />}
              onPress={async () => { if (selected && await run(() => deleteOrganizationAdmin(selected.id), t('dashboard.orgsManager.orgDeleted'))) { delOrg.onClose(); setSelectedId(null); } }}>
              {t('dashboard.orgsManager.deletePermanently')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Member roles */}
      <Modal isOpen={roleModal.isOpen} onOpenChange={roleModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>
            <div>
              <p>{t('dashboard.orgsManager.memberRolesTitle')}</p>
              {editingMember && <p className="text-xs font-normal text-slate-400">{editingMember.name}</p>}
            </div>
          </ModalHeader>
          <ModalBody>
            <Select label={t('dashboard.orgsManager.rolesSelectLabel')} labelPlacement="outside" selectionMode="multiple" variant="bordered"
              placeholder={t('dashboard.orgsManager.selectRolesPlaceholder')}
              selectedKeys={new Set(memberRoleIds)}
              onSelectionChange={(keys) => setMemberRoleIds(Array.from(keys as Set<string>))}>
              {(selected?.roles ?? []).map((r) => <SelectItem key={r.id}>{r.name}</SelectItem>)}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={roleModal.onClose}>{t('dashboard.common.cancel')}</Button>
            <Button variant="bordered" color="primary" isLoading={busy} startContent={<Icon icon="lucide:save" className="size-4" aria-hidden />}
              onPress={async () => { if (editingMember && await run(() => setOrgMemberRoles(editingMember.memberId, memberRoleIds), t('dashboard.orgsManager.rolesUpdated'))) roleModal.onClose(); }}>
              {t('dashboard.common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
