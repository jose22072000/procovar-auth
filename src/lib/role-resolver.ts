import { prisma } from '@/lib/prisma';

export type ProfileRole = 'admin' | 'org-full' | 'org-restricted' | 'client';

export interface RoleResolverUser {
    id: string;
    isSystemAdmin: boolean;
    members?: { role: string; organizationId: string }[];
}

const ORG_FULL_ROLES = new Set(['owner', 'admin']);

export async function resolveProfileRole(user: RoleResolverUser): Promise<ProfileRole> {
    if (user.isSystemAdmin) return 'admin';

    // Use provided members; if empty/missing, query Prisma directly
    let members = user.members ?? [];
    if (members.length === 0) {
        try {
            members = await prisma.member.findMany({
                where: { userId: user.id },
                select: { role: true, organizationId: true },
            });
        } catch {
            members = [];
        }
    }

    if (members.length === 0) return 'client';

    const orgRole = members.find(m => ORG_FULL_ROLES.has(m.role))?.role ?? members[0].role;
    return ORG_FULL_ROLES.has(orgRole) ? 'org-full' : 'org-restricted';
}
