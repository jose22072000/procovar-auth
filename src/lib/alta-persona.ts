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
  organizationId: string;
  roleId: string;
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
 * Dar de alta a una persona en una sucursal, con su contraseña y su rol.
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

  const sucursal = await prisma.organization.findUnique({
    where: { id: datos.organizationId },
    select: { id: true, name: true },
  });
  if (!sucursal) return { error: 'Esa sucursal no existe.' };

  const rol = await prisma.role.findUnique({ where: { id: datos.roleId }, select: { id: true, name: true } });
  if (!rol) return { error: 'Ese rol no existe.' };

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
