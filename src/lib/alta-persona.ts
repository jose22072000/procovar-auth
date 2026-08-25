import { hashPassword } from 'better-auth/crypto';
import { prisma } from './prisma';
import { legacyRoleToSystemRole } from '@/rbac/seed-core';

export interface AltaPersona {
  nombre: string;
  /** Con el que entra. Si no tiene correo, basta con esto. */
  usuario?: string;
  /** Opcional si hay usuario: mucha gente de PEDIDO no tiene correo. */
  email?: string;
  password: string;
  /**
   * Casi siempre vacío: abrir la cuenta y decir dónde trabaja son dos cosas, y cada
   * una tiene su pantalla. Se acepta con valor para el camino de Sucursales, donde
   * se añade a alguien a una sucursal concreta.
   */
  organizationId?: string;
  /**
   * El código con el que vende, si vende: `andy.almanza`.
   *
   * Va aquí y no en una pantalla aparte porque vendedor y usuario son la MISMA
   * persona —comprobado sobre los 82 activos de PEDIDO, uno a uno—. Pedirlo al abrir
   * la cuenta es lo que evita el paso de "ahora empareja este vendedor con este
   * usuario", que es donde se cuelan los errores.
   */
  codigoVendedor?: string;
  roleId: string;
}

/**
 * El SUPER ADMIN no es un rol dentro de una sucursal, es estar por encima de todas.
 *
 * Por eso a una cuenta así no se le pide sucursal al crearla: se le da el mando y
 * después, si hace falta, se le añaden sucursales desde Sucursales. Pedírsela era
 * inventarse una pertenencia que no significa nada —y obligaba a elegir una al azar
 * para poder seguir.
 */
export function esSuperAdmin(nombreDelRol: string): boolean {
  return nombreDelRol.toUpperCase().replace(/[\s_-]/g, '') === 'SUPERADMIN';
}

/**
 * El correo interno de quien no tiene correo.
 *
 * better-auth usa el correo como clave de la cuenta, así que hace falta uno
 * aunque la persona entre por su nombre de usuario. `.local` no es un dominio
 * real y nunca sale a internet: si algo intentara escribir ahí, no llega a
 * ninguna parte en vez de acabar en el buzón de un desconocido.
 */
function correoInterno(usuario: string): string {
  return `${usuario}@procovar.local`;
}

export interface ResultadoAlta {
  userId?: string;
  memberId?: string;
  yaExistia?: boolean;
  error?: string;
}

/**
 * Abrir la cuenta de una persona, con su contraseña y su rol.
 *
 * La sucursal NO se pide aquí. Abrir la cuenta y decir dónde trabaja son dos cosas
 * distintas y cada una tiene su pantalla: la cuenta se abre en Personas, y en
 * Sucursales se dice en cuáles trabaja —que pueden ser varias, o ninguna todavía—.
 * Pedirla al crear obligaba a elegir una al azar para poder seguir, y dejaba a gente
 * colgando de una sucursal en la que nunca puso un pie.
 *
 * # Por qué se crea la cuenta aquí y no por invitación
 *
 * La invitación por correo es lo natural en un producto que vende cuentas: la
 * persona pone su contraseña y nadie más la conoce. Pero esto es la herramienta
 * de casa: entran operadoras y gestores de ocho sucursales, muchos sin correo
 * propio, y esperar a que llegue un mensaje para poder empezar a facturar no es
 * una opción. En PEDIDO ya se hace así —usuario y contraseña los pone quien
 * administra— y quien llega nuevo espera exactamente eso.
 *
 * La contraseña se guarda con el mismo cifrado que usa el resto del sistema
 * (`hashPassword` de better-auth), no con uno propio: si aquí se hiciera de otra
 * manera, la persona no podría entrar y el fallo aparecería en el login, lejos
 * de su causa.
 *
 * # Si el correo ya existe
 *
 * No se crea otra cuenta ni se le cambia la contraseña a nadie: se le añade la
 * sucursal. Una misma persona puede llevar dos sucursales, y son dos membresías
 * de la MISMA cuenta. Crear una segunda cuenta con el mismo correo partiría su
 * historial en dos y la auditoría dejaría de poder responder quién hizo qué.
 */
export async function altaPersona(datos: AltaPersona): Promise<ResultadoAlta> {
  const nombre = datos.nombre.trim();
  const usuario = datos.usuario?.trim().toLowerCase() || null;
  const codigoVendedor = datos.codigoVendedor?.trim().toLowerCase() || null;
  const email = datos.email?.trim().toLowerCase() || (usuario ? correoInterno(usuario) : '');

  if (!nombre) return { error: 'Hace falta el nombre.' };
  if (!usuario && !email) return { error: 'Hace falta un usuario o un correo.' };
  if (email && !email.includes('@')) return { error: 'Ese correo no parece válido.' };
  if (usuario && !/^[a-z0-9._-]+$/.test(usuario)) {
    return { error: 'El usuario solo puede llevar letras, números, punto, guion y guion bajo.' };
  }

  if (usuario) {
    const ocupado = await prisma.user.findUnique({ where: { username: usuario }, select: { id: true } });
    if (ocupado) return { error: `El usuario "${usuario}" ya está cogido.` };
  }

  // Dos personas con el mismo código de vendedor harían que sus pedidos y sus
  // comisiones se mezclaran sin que nada fallara: cuadraría el total y estaría mal
  // repartido, que es la peor forma de estar mal.
  if (codigoVendedor) {
    const ocupado = await prisma.user.findUnique({
      where: { codigoVendedor },
      select: { name: true },
    });
    if (ocupado) return { error: `El código "${codigoVendedor}" ya es de ${ocupado.name}.` };
  }

  const rol = await prisma.role.findUnique({
    where: { id: datos.roleId },
    select: {
      id: true, name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  });
  if (!rol) return { error: 'Ese rol no existe.' };

  // Que la pantalla esconda el campo es comodidad; esto es lo que lo impide de verdad.
  // Sin esta comprobación, una llamada a mano —o la pantalla con un rol cambiado a
  // medias— podría colgarle un código de vendedor a un operador, y ese código dejaría
  // de estar disponible para quien sí vende, sin que nadie entendiera por qué.
  const vende = rol.permissions.some((p) => p.permission?.key === 'vendedor.codigo');
  if (codigoVendedor && !vende) {
    return { error: `El rol ${rol.name} no vende, así que no lleva código de vendedor.` };
  }

  const mandaEnTodo = esSuperAdmin(rol.name);

  const sucursal = datos.organizationId
    ? await prisma.organization.findUnique({
        where: { id: datos.organizationId },
        select: { id: true, name: true },
      })
    : null;
  if (datos.organizationId && !sucursal) return { error: 'Esa sucursal no existe.' };

  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (!existente && datos.password.length < 8) {
    return { error: 'La contraseña necesita 8 caracteres o más.' };
  }

  let userId = existente?.id;
  const yaExistia = Boolean(existente);

  if (!userId) {
    const hash = await hashPassword(datos.password);
    const creado = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: nombre,
          email,
          username: usuario,
          // La da de alta quien administra, en persona. Mandar a verificar un
          // correo que quizá no existe solo serviría para dejarla a medias.
          emailVerified: true,
          // Es lo que hace que un SUPER ADMIN pueda de verdad: el permiso no le
          // viene de pertenecer a una sucursal, le viene de esto. Sin marcarlo, la
          // cuenta llevaría el nombre del rol y no podría con nada.
          isSystemAdmin: mandaEnTodo,
          // El rol, en la persona. La cuenta se abre sin sucursal, así que si el rol
          // solo viviera en la membresía no estaría en ninguna parte, y al meterla en
          // su primera sucursal habría que volver a preguntarlo.
          defaultRoleId: rol.id,
          codigoVendedor,
        },
        select: { id: true },
      });
      // better-auth guarda la contraseña en `account`, no en `user`: el usuario
      // puede tener varias formas de entrar (correo, Google) y cada una es una
      // cuenta. Sin esta fila, la persona existe y no puede entrar.
      await tx.account.create({
        data: {
          userId: u.id,
          accountId: u.id,
          providerId: 'credential',
          password: hash,
        },
      });
      return u;
    });
    userId = creado.id;
  }

  // A quien ya tenía cuenta y ahora se le da el mando, hay que dárselo de verdad.
  if (mandaEnTodo) {
    await prisma.user.update({ where: { id: userId }, data: { isSystemAdmin: true } });
  }

  // Y si venía sin rol escrito —cuenta de antes de que esto existiera—, se le pone.
  if (yaExistia) {
    await prisma.user.updateMany({
      where: { id: userId, defaultRoleId: null },
      data: { defaultRoleId: rol.id },
    });
  }

  // Sin sucursal, aquí se acaba: la cuenta existe, tiene su rol y puede entrar. En
  // cuáles trabaja se dice en Sucursales, y pueden ser varias o ninguna todavía.
  if (!sucursal) return { userId, yaExistia };

  const yaMiembro = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: sucursal.id } },
    select: { id: true },
  });
  if (yaMiembro) {
    return { error: `Esa persona ya está en ${sucursal.name}. Cámbiale el rol desde su ficha.` };
  }

  const miembro = await prisma.member.create({
    data: {
      userId,
      organizationId: sucursal.id,
      role: legacyRoleToSystemRole(rol.name),
      memberRoles: { create: { roleId: rol.id } },
    },
    select: { id: true },
  });

  return { userId, memberId: miembro.id, yaExistia };
}
