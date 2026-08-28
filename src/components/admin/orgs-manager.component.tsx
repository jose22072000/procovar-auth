"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  Avatar, Button, Chip, Input, Select, SelectItem, Switch, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, addToast,
} from "@heroui/react";
import { removeOrgMember, setOrgMemberRoles, updateOrganizationAdmin, deleteOrganizationAdmin, agregarMiembro, crearSucursal } from "@/app/(user)/dashboard/_actions";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { correoVisible } from "@/lib/correo-visible";

interface RoleRow { id: string; name: string; color: string | null; icon: string | null; isSystem: boolean }
interface MemberRow { memberId: string; userId: string; name: string; email: string; legacyRole: string; roleIds: string[] }
interface OrgRow {
  id: string; name: string; slug: string; logo: string | null;
  memberCount: number; roles: RoleRow[]; members: MemberRow[];
  codigo?: string | null; activa?: boolean; timezone?: string | null;
  telefono?: string | null; direccion?: string | null;
  latitud?: number | null; longitud?: number | null;
  almacenes?: {
    id: string; nombre: string; direccion: string | null;
    latitud: number | null; longitud: number | null;
    principal: boolean; activo: boolean;
  }[];
}

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

interface Persona { id: string; name: string; email: string }

/**
 * Un almacén tal como se edita en el formulario.
 *
 * Latitud y longitud van como TEXTO y no como número: mientras alguien escribe "21."
 * eso no es un número válido, y forzarlo borraría el punto en cuanto lo teclea. Se
 * convierten al guardar.
 */
interface AlmacenForm {
  id?: string;
  nombre: string;
  direccion: string;
  latitud: string;
  longitud: string;
  principal: boolean;
}

export function OrgsManager({
  initialOrgs,
  personas = [],
}: {
  initialOrgs: OrgRow[];
  personas?: Persona[];
}) {
  const router = useRouter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialOrgs[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const editOrg = useDisclosure();
  const delOrg = useDisclosure();
  const roleModal = useDisclosure();
  const [orgForm, setOrgForm] = useState({
    name: "", slug: "", logo: "",
    codigo: "", activa: true, timezone: "America/Havana", telefono: "", direccion: "",
    latitud: "", longitud: "",
    almacenes: [] as AlmacenForm[],
  });
  const [delConfirm, setDelConfirm] = useState("");
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>([]);
  const alta = useDisclosure();
  const nuevaOrg = useDisclosure();
  const [nombreNueva, setNombreNueva] = useState("");
  // Lo demás de la sucursal nueva. Todo opcional menos el nombre, pero se pide AQUÍ:
  // es cuando la persona tiene los datos delante, y el código es la clave con la que las
  // otras aplicaciones la van a reconocer.
  const [nuevaCodigo, setNuevaCodigo] = useState("");
  const [nuevaTelefono, setNuevaTelefono] = useState("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [nuevaLat, setNuevaLat] = useState("");
  const [nuevaLng, setNuevaLng] = useState("");
  // Aquí NO se crean cuentas: se elige a alguien que ya existe y se le dice en qué
  // sucursal trabaja. Crear la persona es de la pantalla de Personas.
  const [altaForm, setAltaForm] = useState<{ userId: string }>({ userId: "" });
  const [buscaPersona, setBuscaPersona] = useState("");

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
  // Los números se guardan como TEXTO mientras se editan. Si se guardaran como número,
  // borrar el contenido daría NaN y el campo se quedaría bloqueado sin poder escribir
  // otra cosa. Se convierten al enviar, no al teclear.
  const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  function openEditOrg() {
    if (!selected) return;
    setOrgForm({
      name: selected.name, slug: selected.slug, logo: selected.logo ?? "",
      codigo: txt(selected.codigo), activa: selected.activa ?? true,
      timezone: selected.timezone || "America/Havana",
      telefono: txt(selected.telefono), direccion: txt(selected.direccion),
      latitud: txt(selected.latitud), longitud: txt(selected.longitud),
      almacenes: (selected.almacenes ?? []).map((a) => ({
        id: a.id,
        nombre: a.nombre,
        direccion: a.direccion ?? "",
        latitud: txt(a.latitud),
        longitud: txt(a.longitud),
        principal: a.principal,
      })),
    });
    editOrg.onOpen();
  }
  function openDelOrg() { setDelConfirm(""); delOrg.onOpen(); }
  function openRoles(m: MemberRow) { setEditingMember(m); setMemberRoleIds(m.roleIds); roleModal.onOpen(); }

  function abrirAlta() {
    if (!selected) return;
    // El rol más limitado por defecto. Quien añade a diez personas seguidas acaba
    // dándole a Guardar sin mirar, y equivocarse hacia abajo se arregla con un
    // clic; hacia arriba, no se nota.
    setAltaForm({ userId: "" });
    setBuscaPersona("");
    alta.onOpen();
  }

  // Los que todavía no están en esta sucursal: ofrecer a quien ya está dentro solo
  // sirve para preguntarse si se hizo algo mal.
  const candidatos = useMemo(() => {
    if (!selected) return [];
    const dentro = new Set(selected.members.map((m) => m.userId));
    const q = buscaPersona.trim().toLowerCase();
    return personas
      .filter((p) => !dentro.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .slice(0, 50);
  }, [selected, personas, buscaPersona]);

  async function guardarAlta() {
    if (!selected || !altaForm.userId) return;
    setBusy(true);
    const res = await agregarMiembro({ organizationId: selected.id, userId: altaForm.userId });
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return; }
    addToast({
      title: res.yaEstaba
        ? "Ya estaba en la sucursal"
        : `Añadida a ${selected.name}${res.rol ? ` como ${res.rol}` : ""}`,
      color: "success",
    });
    alta.onClose();
    router.refresh();
  }

  async function crearNueva() {
    const nombre = nombreNueva.trim();
    if (!nombre) return;
    setBusy(true);
    const res = await crearSucursal({
      nombre,
      codigo: nuevaCodigo.trim() || undefined,
      telefono: nuevaTelefono.trim() || undefined,
      direccion: nuevaDireccion.trim() || undefined,
      // Vacío es «no lo sé», no cero: un cero en latitud pone la sucursal en el Atlántico.
      latitud: nuevaLat.trim() ? Number(nuevaLat) : null,
      longitud: nuevaLng.trim() ? Number(nuevaLng) : null,
    });
    setBusy(false);
    if (res.error) {
      addToast({ title: res.error, color: "danger" });
      return;
    }
    addToast({ title: `Sucursal "${nombre}" creada`, color: "success" });
    if (res.orgId) setSelectedId(res.orgId);
    setNombreNueva("");
    setNuevaCodigo(""); setNuevaTelefono(""); setNuevaDireccion(""); setNuevaLat(""); setNuevaLng("");
    nuevaOrg.onClose();
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] lg:h-[calc(100dvh-8.5rem)] lg:overflow-hidden">
      {/*
      Dos columnas con ALTURA PROPIA, y cada una con su desplazamiento.

      Empezó siendo `sticky` y no se quedaba: bajaba con el contenido de la derecha, así
      que al mirar el miembro número treinta de una sucursal la lista ya no estaba en
      pantalla. `sticky` depende de a qué ancestro se pega, y aquí hay varios con
      `overflow` por medio —el panel del menú, el contenedor que desplaza la página—:
      basta uno para que deje de agarrar, y desde fuera parece que la clase no hace nada.

      Con altura propia no depende de ningún ancestro. Y DENTRO de la columna sólo se
      desplaza la lista: el botón de crear y el buscador se quedan arriba. Desplazando la
      columna entera se iban con ella —para buscar una sucursal había que subir primero—,
      y el final de la lista quedaba por debajo del borde de la pantalla, sin forma de
      llegar a las últimas.

      `dvh` y no `vh`: en el móvil la barra del navegador aparece y desaparece, y con `vh`
      la última fila se queda debajo de ella justo cuando se va a tocar.

      Sólo en pantallas anchas. En un teléfono las dos columnas van una debajo de otra y
      partir la pantalla en dos trozos con desplazamiento propio la haría inservible.
    */}
      <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
        {/* Crear sucursal. Faltaba entero: se podían editar y borrar, pero abrir
            una nueva exigía tocar la base a mano. */}
        <Button
          className="shrink-0"
          fullWidth color="primary"
          startContent={<Icon icon="lucide:plus" className="size-4" aria-hidden />}
          onPress={() => nuevaOrg.onOpen()}
        >
          Nueva sucursal
        </Button>
        <Input
          className="shrink-0"
          variant="bordered" label={t('dashboard.orgsManager.searchOrgLabel')} labelPlacement="outside" placeholder={t('dashboard.orgsManager.searchOrgPlaceholder')}
          value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")}
          startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
        />
        {/* `min-h-0` es lo que hace que un hijo con scroll dentro de un flex se encoja:
            sin él crece con su contenido y el desplazamiento se va al padre. */}
        <div className="space-y-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
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

      {/* Selected org detail — con su propio desplazamiento, para que la lista de la
          izquierda no tenga que bajar con él. */}
      {selected ? (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 lg:h-full lg:overflow-y-auto">
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
                    <div className="truncate text-xs text-slate-400">{correoVisible(m.email) ?? "sin correo"}</div>
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
      <Panel isOpen={alta.isOpen} onOpenChange={alta.onOpenChange} size="lg">
        <ModalContent>
          <ModalHeader className="flex-col items-start gap-0.5">
            <span>{t('dashboard.orgsManager.addPerson')}</span>
            <span className="text-sm font-normal text-slate-500">{selected?.name}</span>
          </ModalHeader>
          <ModalBody className="gap-3">
            {/* Se busca por nombre o por correo. El correo es único, así que es lo
                que distingue a dos personas que se llaman igual — y en una empresa
                pasa. */}
            <Input
              autoFocus variant="bordered" label="Buscar persona" labelPlacement="outside"
              placeholder="Nombre o correo…"
              value={buscaPersona} onValueChange={setBuscaPersona} isClearable
              onClear={() => setBuscaPersona("")}
              startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
            />

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1 dark:border-slate-700">
              {candidatos.map((p) => {
                const elegida = altaForm.userId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAltaForm((f) => ({ ...f, userId: p.id }))}
                    className={
                      "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors " +
                      (elegida
                        ? "border-pv-azul/40 bg-pv-azul/8 dark:border-white/25 dark:bg-white/10"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800")
                    }
                  >
                    <Avatar name={p.name} size="sm" radius="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="pv-codigo truncate text-xs text-slate-400">{correoVisible(p.email) ?? "sin correo"}</div>
                    </div>
                    {elegida && <Icon icon="lucide:check" className="size-4 shrink-0 text-pv-azul" aria-hidden />}
                  </button>
                );
              })}
              {candidatos.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-slate-400">
                  {personas.length === 0
                    ? "Desde esta pantalla no se puede elegir a nadie. Se hace en Personas."
                    : buscaPersona
                      ? "Nadie coincide con esa búsqueda."
                      : "Todas las personas ya están en esta sucursal."}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Se queda con el rol que ya tiene: se le dio al abrir su cuenta. Aquí solo
              se dice en qué sucursal trabaja. Para abrir una cuenta nueva,
              Personas → Nueva persona.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={alta.onClose}
              startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />}>
              {t('dashboard.common.cancel')}
            </Button>
            <Button color="primary" isLoading={busy} onPress={guardarAlta}
              isDisabled={!altaForm.userId}
              startContent={<Icon icon="lucide:user-plus" className="size-4" aria-hidden />}>
              {t('dashboard.orgsManager.addPerson')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Panel>

      {/* Edit org */}
      <Panel isOpen={nuevaOrg.isOpen} onOpenChange={nuevaOrg.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Nueva sucursal</ModalHeader>
          <ModalBody className="gap-3">
            <Input
              autoFocus variant="bordered" label="Nombre" labelPlacement="outside"
              placeholder="Camagüey"
              value={nombreNueva} onValueChange={setNombreNueva}
            />
            {/* El CÓDIGO es lo que más falta hace de lo que no se pedía: es la clave con
                la que PEDIDO, delivery y Rutas se refieren a esta sucursal. Sin él existe
                aquí y no la conoce nadie más. */}
            <Input
              variant="bordered" label="Código" labelPlacement="outside"
              placeholder="CAM"
              description="Con el que la reconocen PEDIDO, delivery y Rutas. Sin él, esta sucursal sólo existe aquí."
              value={nuevaCodigo}
              onValueChange={(v) => setNuevaCodigo(v.toUpperCase())}
            />
            <Input
              variant="bordered" label="Teléfono" labelPlacement="outside"
              value={nuevaTelefono} onValueChange={setNuevaTelefono}
            />
            <Input
              variant="bordered" label="Dirección" labelPlacement="outside"
              value={nuevaDireccion} onValueChange={setNuevaDireccion}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                variant="bordered" label="Latitud" labelPlacement="outside" type="number"
                value={nuevaLat} onValueChange={setNuevaLat}
              />
              <Input
                variant="bordered" label="Longitud" labelPlacement="outside" type="number"
                value={nuevaLng} onValueChange={setNuevaLng}
              />
            </div>
            <p className="text-xs text-slate-400">
              Sólo el nombre es obligatorio; el resto se puede completar después en
              «Editar», y los almacenes también. La dirección web se saca del nombre, y
              quien la crea entra dentro como ADMINISTRADOR: una sucursal sin nadie no se
              puede ni abrir.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={nuevaOrg.onClose} isDisabled={busy}>Cancelar</Button>
            <Button color="primary" onPress={crearNueva} isLoading={busy} isDisabled={!nombreNueva.trim()}>
              Crear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Panel>

      <Panel isOpen={editOrg.isOpen} onOpenChange={editOrg.onOpenChange}>
        <ModalContent>
          <ModalHeader>{t('dashboard.orgsManager.editOrgTitle')}</ModalHeader>
          <ModalBody className="gap-3">
            <Input label={t('dashboard.orgsManager.nameLabel')} variant="bordered" value={orgForm.name} onValueChange={(v) => setOrgForm((f) => ({ ...f, name: v }))} />
            <Input label={t('dashboard.orgsManager.slugLabel')} variant="bordered" value={orgForm.slug} onValueChange={(v) => setOrgForm((f) => ({ ...f, slug: v }))} startContent={<span className="text-slate-400">@</span>} />
            <Input label={t('dashboard.orgsManager.logoLabel')} variant="bordered" value={orgForm.logo} onValueChange={(v) => setOrgForm((f) => ({ ...f, logo: v }))} />

            {/* El código es lo que cruza esta sucursal con PEDIDO, Rutas, delivery y el
                consolidado de Parranda. Va arriba y no escondido: equivocarlo hace que
                los pedidos de una sucursal se cuenten en otra. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Código" description="CAM, STG, HAB… el mismo en todos los sistemas"
                variant="bordered" value={orgForm.codigo}
                onValueChange={(v) => setOrgForm((f) => ({ ...f, codigo: v.toUpperCase() }))}
              />
              <Input
                label="Zona horaria" description="De ella dependen las jornadas y los informes"
                variant="bordered" value={orgForm.timezone}
                onValueChange={(v) => setOrgForm((f) => ({ ...f, timezone: v }))}
              />
            </div>

            <Input label="Teléfono" variant="bordered" value={orgForm.telefono}
              onValueChange={(v) => setOrgForm((f) => ({ ...f, telefono: v }))} />
            <Input label="Dirección" variant="bordered" value={orgForm.direccion}
              onValueChange={(v) => setOrgForm((f) => ({ ...f, direccion: v }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Latitud" variant="bordered" value={orgForm.latitud}
                onValueChange={(v) => setOrgForm((f) => ({ ...f, latitud: v }))} />
              <Input label="Longitud" variant="bordered" value={orgForm.longitud}
                onValueChange={(v) => setOrgForm((f) => ({ ...f, longitud: v }))} />
            </div>

            {/* EL ALMACÉN, aparte y avisado. No es un dato más de contacto: el
                domicilio se cobra por la distancia DESDE AQUÍ, así que un punto mal
                puesto se cobra mal en cada entrega. */}
            {/*
              Los almacenes, en lista. Una sucursal puede tener varios.
              
              Estaba como un solo juego de campos, dando por hecho que hay uno. Con dos,
              el segundo no cabía en ninguna parte y acabaría metido en la dirección del
              primero — y el domicilio se cobra por la distancia DESDE EL ALMACÉN, así
              que medir desde el que no es se cobra mal en cada entrega.
            */}
            <div className="rounded-lg border border-warning-200 bg-warning-50/40 p-3 dark:border-warning-800 dark:bg-warning-900/10">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Almacenes</p>
                <Button
                  size="sm" variant="flat"
                  startContent={<Icon icon="lucide:plus" className="size-3.5" aria-hidden />}
                  onPress={() =>
                    setOrgForm((f) => ({
                      ...f,
                      almacenes: [
                        ...f.almacenes,
                        // El primero que se añade es el principal: si no, hay que
                        // acordarse de marcarlo y sin ninguno marcado no se sabe desde
                        // dónde medir.
                        { nombre: "", direccion: "", latitud: "", longitud: "", principal: f.almacenes.length === 0 },
                      ],
                    }))
                  }
                >
                  Añadir
                </Button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                De aquí sale la mercancía. El domicilio se cobra por la distancia desde
                el almacén, no desde la oficina.
              </p>

              {orgForm.almacenes.length === 0 ? (
                <p className="py-2 text-xs text-slate-500">
                  Esta sucursal no tiene almacenes. Sin uno, no se puede calcular el
                  domicilio de sus pedidos.
                </p>
              ) : (
                <div className="space-y-3">
                  {orgForm.almacenes.map((a, idx) => (
                    <div key={a.id ?? `nuevo-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-2 flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={a.principal}
                          onValueChange={() =>
                            // Sólo uno puede ser el principal: marcar otro desmarca el
                            // anterior. Con dos, cada aplicación mediría desde uno
                            // distinto y el mismo domicilio saldría a dos precios.
                            setOrgForm((f) => ({
                              ...f,
                              almacenes: f.almacenes.map((x, i2) => ({ ...x, principal: i2 === idx })),
                            }))
                          }
                        >
                          <span className="text-xs">Principal</span>
                        </Switch>
                        <Button
                          size="sm" variant="light" color="danger" className="ml-auto"
                          onPress={() =>
                            setOrgForm((f) => {
                              const quedan = f.almacenes.filter((_, i2) => i2 !== idx);

                              // Si se borra el principal, el primero que quede lo hereda.
                              if (quedan.length && !quedan.some((x) => x.principal)) quedan[0].principal = true;

                              return { ...f, almacenes: quedan };
                            })
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <Input
                          label="Nombre" variant="bordered" size="sm" value={a.nombre}
                          onValueChange={(v) =>
                            setOrgForm((f) => ({ ...f, almacenes: f.almacenes.map((x, i2) => (i2 === idx ? { ...x, nombre: v } : x)) }))
                          }
                        />
                        <Input
                          label="Dirección" variant="bordered" size="sm" value={a.direccion}
                          onValueChange={(v) =>
                            setOrgForm((f) => ({ ...f, almacenes: f.almacenes.map((x, i2) => (i2 === idx ? { ...x, direccion: v } : x)) }))
                          }
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            label="Latitud" variant="bordered" size="sm" value={a.latitud}
                            onValueChange={(v) =>
                              setOrgForm((f) => ({ ...f, almacenes: f.almacenes.map((x, i2) => (i2 === idx ? { ...x, latitud: v } : x)) }))
                            }
                          />
                          <Input
                            label="Longitud" variant="bordered" size="sm" value={a.longitud}
                            onValueChange={(v) =>
                              setOrgForm((f) => ({ ...f, almacenes: f.almacenes.map((x, i2) => (i2 === idx ? { ...x, longitud: v } : x)) }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Switch isSelected={orgForm.activa} onValueChange={(v) => setOrgForm((f) => ({ ...f, activa: v }))}>
              Sucursal activa
            </Switch>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" startContent={<Icon icon="lucide:x-circle" className="size-4" aria-hidden />} onPress={editOrg.onClose}>{t('dashboard.common.cancel')}</Button>
            <Button variant="bordered" color="primary" isLoading={busy} startContent={<Icon icon="lucide:save" className="size-4" aria-hidden />}
              onPress={async () => {
                // Vacío es NULO, no cero. `Number("")` da 0, y un 0 en una coordenada
                // es un punto real en el golfo de Guinea: el domicilio se calcularía
                // contra él en vez de fallar.
                const num = (v: string) => (v.trim() === "" ? null : Number(v));
                const ok = selected && await run(() => updateOrganizationAdmin(selected.id, {
                  name: orgForm.name, slug: orgForm.slug, logo: orgForm.logo || null,
                  codigo: orgForm.codigo.trim() || null,
                  activa: orgForm.activa,
                  timezone: orgForm.timezone.trim() || "America/Havana",
                  telefono: orgForm.telefono.trim() || null,
                  direccion: orgForm.direccion.trim() || null,
                  latitud: num(orgForm.latitud), longitud: num(orgForm.longitud),
                  almacenes: orgForm.almacenes.map((a) => ({
                    id: a.id,
                    nombre: a.nombre.trim(),
                    direccion: a.direccion.trim() || null,
                    latitud: num(a.latitud),
                    longitud: num(a.longitud),
                    principal: a.principal,
                  })),
                }), t('dashboard.orgsManager.orgUpdated'));
                if (ok) editOrg.onClose();
              }}>
              {t('dashboard.common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Panel>

      {/* Delete org (typed slug confirm) */}
      <Panel isOpen={delOrg.isOpen} onOpenChange={delOrg.onOpenChange}>
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
      </Panel>

      {/* Member roles */}
      <Panel isOpen={roleModal.isOpen} onOpenChange={roleModal.onOpenChange}>
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
      </Panel>
    </div>
  );
}
