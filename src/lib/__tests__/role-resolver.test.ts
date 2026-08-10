import { describe, it, expect, vi } from 'vitest';

// `role-resolver` consulta Prisma cuando no le pasan `members`. En este test
// no hay base de datos, así que se mockea a un cliente que falla: es
// exactamente la situación que el resolver tiene que sobrevivir (sin miembros
// conocidos y sin poder preguntarlos → 'client').
vi.mock('@/lib/prisma', () => ({
    prisma: {
        member: {
            findMany: vi.fn().mockRejectedValue(new Error('sin base de datos en el test')),
        },
    },
}));

import { resolveProfileRole, type ProfileRole, type RoleResolverUser } from '../role-resolver';

const baseUser: RoleResolverUser = {
    id: 'user-1',
    isSystemAdmin: false,
    members: [],
};

describe('resolveProfileRole', () => {
    it('returns admin for isSystemAdmin=true regardless of members', async () => {
        const result = await resolveProfileRole({ ...baseUser, isSystemAdmin: true, members: [] });
        expect(result).toBe<ProfileRole>('admin');
    });

    it('returns client if no org memberships', async () => {
        const result = await resolveProfileRole(baseUser);
        expect(result).toBe<ProfileRole>('client');
    });

    it('returns org-full for org member with role owner', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-full');
    });

    it('returns org-full for org member with role admin', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'admin', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-full');
    });

    it('returns org-restricted for staff', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'staff', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-restricted');
    });

    it('returns org-restricted for agent', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'agent', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-restricted');
    });

    /**
     * La regresión que fija este bloque, y por la que estos dos tests dejaron
     * de decir lo que decían.
     *
     * El resolver preguntaba a qb-back si el usuario tenía ficha de Owner y,
     * si la respuesta era "no" —o si no había respuesta—, devolvía 'client'.
     * Eso significaba que un propietario perdía su panel cada vez que qb-back
     * estaba caído o lento: el estado de qb-back decidía el rol de la persona.
     * El commit 9ee1a4e quitó esa llamada y dejó el rol donde vive de verdad,
     * en la pertenencia a la organización. Los tests se quedaron pidiendo el
     * comportamiento viejo y llevaban desde entonces en rojo.
     *
     * Se reescriben en vez de restaurar la llamada: volver atrás reintroduce
     * justo el fallo que aquel commit arregló.
     */
    it('un propietario NO se degrada a client porque qb-back no conteste', async () => {
        // No hay nada que mockear: el resolver ya no habla con qb-back. Que
        // este test pase sin ningún doble es la prueba de la propiedad.
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        expect(await resolveProfileRole(user)).toBe<ProfileRole>('org-full');
    });

    it('la pertenencia decide el rol, no un servicio externo', async () => {
        const staff: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'staff', organizationId: 'org-1' }],
        };
        expect(await resolveProfileRole(staff)).toBe<ProfileRole>('org-restricted');
    });

    it('con varias pertenencias gana la de más alcance', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            members: [
                { role: 'staff', organizationId: 'org-1' },
                { role: 'owner', organizationId: 'org-2' },
            ],
        };
        expect(await resolveProfileRole(user)).toBe<ProfileRole>('org-full');
    });

    it('admin takes priority over org membership', async () => {
        const user: RoleResolverUser = {
            ...baseUser,
            isSystemAdmin: true,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('admin');
    });

    it('si Prisma falla y no hay miembros conocidos, cae a client', async () => {
        const result = await resolveProfileRole({ id: 'user-2', isSystemAdmin: false });
        expect(result).toBe<ProfileRole>('client');
    });
});
