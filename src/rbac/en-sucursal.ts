import { prisma } from '@/lib/prisma'
import { resolveRbac } from './resolve-permissions'
import type { ResolvedRbac } from './types'

const vacio = (org: string | null): ResolvedRbac => ({ org, wildcard: false, global: [] })

/**
 * Lo que esta persona puede hacer EN esta sucursal — y sólo en ella.
 *
 * `resolveRbac` contesta a otra pregunta: «qué lleva encima esta persona, mirado
 * desde esta sucursal». Y a propósito suma los permisos de su rol AUNQUE no sea
 * miembro: su propio comentario lo dice —«Sin membresía, lo que la persona lleva
 * encima. Pertenecer a la sucursal es otra pregunta, y la contesta quien llame a
 * esto mirando `org`»—. Eso está bien para «¿puede entrar en PEDIDO?», que no
 * depende de ninguna sucursal.
 *
 * Lo que pasaba es que NADIE hacía la otra pregunta. Todas las puertas que actúan
 * SOBRE una sucursal —dar de alta, quitar, cambiar roles— hacían
 * `resolveRbac(yo, elIdQueVengaEnLaPeticion)` y `can(...)`. Un ADMINISTRADOR de
 * Camagüey lleva `member.invite` en su rol, así que al mandar el id de Holguín la
 * comprobación decía que sí: creaba, quitaba y cambiaba roles en una sucursal en
 * la que no está. El alcance salía del parámetro, que es justo lo que no puede
 * pasar.
 *
 * Aquí el alcance sale de QUIÉN PREGUNTA: sin membresía en esa sucursal, no lleva
 * nada en ella. El Super Admin y el Desarrollador siguen pudiendo en todas, que es
 * lo que significa el comodín y no depende de pertenecer a ninguna.
 */
export async function rbacEnSucursal(
  userId: string,
  orgId: string | null | undefined,
): Promise<ResolvedRbac> {
  const rbac = await resolveRbac(userId, orgId ?? null)
  if (rbac.wildcard) return rbac
  // Sin sucursal no hay nada sobre lo que actuar. Sólo el comodín llega aquí.
  if (!orgId) return vacio(null)

  const miembro = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { id: true },
  })
  if (!miembro) return vacio(orgId)
  return rbac
}

/**
 * Los roles que esta persona lleva EN esta sucursal, por su nombre.
 *
 * Es lo mismo que suma `resolveRbac`: el rol de la PERSONA (`defaultRole`, que es
 * el suyo esté donde esté) más los que tenga en esta sucursal concreta. Que las dos
 * cosas se calculen igual es lo que evita que el techo y los permisos digan cosas
 * distintas de la misma persona.
 *
 * Vacío si no es miembro: quien no está en la sucursal no reparte nada en ella.
 */
export async function rolesEnSucursal(
  userId: string,
  orgId: string | null | undefined,
): Promise<string[]> {
  if (!orgId) return []

  const miembro = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { memberRoles: { select: { role: { select: { name: true } } } } },
  })
  if (!miembro) return []

  const persona = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultRole: { select: { name: true } } },
  })

  const nombres = new Set<string>()
  if (persona?.defaultRole?.name) nombres.add(persona.defaultRole.name)
  for (const mr of miembro.memberRoles ?? []) {
    if (mr.role?.name) nombres.add(mr.role.name)
  }
  return [...nombres]
}
