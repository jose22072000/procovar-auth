import type { PermissionEntry } from './types'

const e = (
  key: string, group: string, service: string, es: string, en: string,
): PermissionEntry => {
  const [resource, action] = key.split('.')
  return { key, resource, action, service, group, label: { es, en } }
}

export const PERMISSION_CATALOG: PermissionEntry[] = [
  // Propiedades (qb-back)
  e('property.read',   'Propiedades', 'qb-back', 'Ver propiedades', 'View properties'),
  e('property.create', 'Propiedades', 'qb-back', 'Crear propiedades', 'Create properties'),
  e('property.edit',   'Propiedades', 'qb-back', 'Editar propiedades', 'Edit properties'),
  e('property.delete', 'Propiedades', 'qb-back', 'Eliminar propiedades', 'Delete properties'),
  // Room types / rooms (qb-back)
  e('roomType.read', 'Tipos de habitación', 'qb-back', 'Ver tipos de habitación', 'View room types'),
  e('roomType.edit', 'Tipos de habitación', 'qb-back', 'Editar tipos de habitación', 'Edit room types'),
  e('room.manage',   'Tipos de habitación', 'qb-back', 'Gestionar habitaciones', 'Manage rooms'),
  // Media (qb-back)
  e('media.read',   'Media', 'qb-back', 'Ver media', 'View media'),
  e('media.upload', 'Media', 'qb-back', 'Subir media', 'Upload media'),
  e('media.edit',   'Media', 'qb-back', 'Editar media', 'Edit media'),
  e('media.delete', 'Media', 'qb-back', 'Eliminar media', 'Delete media'),
  // Tarifas / precios (qb-back)
  e('rate.read',       'Tarifas', 'qb-back', 'Ver tarifas', 'View rates'),
  e('rate.edit',       'Tarifas', 'qb-back', 'Editar tarifas', 'Edit rates'),
  e('pricing.manage',  'Tarifas', 'qb-back', 'Gestionar precios', 'Manage pricing'),
  // Reservas (qb-back) — solo control de VISIBILIDAD del panel de reservas.
  // Las acciones (crear/modificar/cancelar/check-in/out) no son permiso: el
  // huésped las crea en QBT y la operativa la hace cualquiera de la org.
  e('reservation.read', 'Reservas', 'qb-back', 'Ver reservas', 'View reservations'),
  // Miembros / roles (qb-auth)
  e('member.read',       'Miembros', 'qb-auth', 'Ver miembros', 'View members'),
  e('member.invite',     'Miembros', 'qb-auth', 'Invitar miembros', 'Invite members'),
  e('member.remove',     'Miembros', 'qb-auth', 'Quitar miembros', 'Remove members'),
  e('member.assignRole', 'Miembros', 'qb-auth', 'Asignar roles', 'Assign roles'),
  e('role.read',   'Roles', 'qb-auth', 'Ver roles', 'View roles'),
  e('role.create', 'Roles', 'qb-auth', 'Crear roles', 'Create roles'),
  e('role.edit',   'Roles', 'qb-auth', 'Editar roles', 'Edit roles'),
  e('role.delete', 'Roles', 'qb-auth', 'Eliminar roles', 'Delete roles'),
  // Finanzas / reportes (qb-back) — declarado, enforcement luego
  e('finance.read', 'Finanzas', 'qb-back', 'Ver finanzas', 'View finance'),
  e('report.read',  'Finanzas', 'qb-back', 'Ver reportes', 'View reports'),
  e('payout.read',  'Finanzas', 'qb-back', 'Ver pagos / payouts', 'View payouts'),
  // Reembolsos (qb-back) — solicitud del huésped; owner/staff aprueba o rechaza.
  e('refund.read',   'Reembolsos', 'qb-back', 'Ver solicitudes de reembolso', 'View refund requests'),
  e('refund.manage', 'Reembolsos', 'qb-back', 'Aprobar / rechazar reembolsos', 'Approve / reject refunds'),
  // Organización (qb-auth)
  e('organization.read',     'Organización', 'qb-auth', 'Ver / gestionar organización', 'View organization page'),
  e('organization.edit',     'Organización', 'qb-auth', 'Editar organización', 'Edit organization'),
  e('organization.settings', 'Organización', 'qb-auth', 'Configuración de organización', 'Organization settings'),
  // Planes / suscripción (qb-auth)
  e('plan.read', 'Planes', 'qb-auth', 'Ver planes y suscripción', 'View plans & subscription'),
]
