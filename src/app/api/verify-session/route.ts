import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRbac } from "@/rbac/resolve-permissions";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/verify-session:
 *   get:
 *     summary: Verify user session
 *     description: Checks if the request has a valid session cookie and returns the session, user info, and organization memberships.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Valid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     activeOrganizationId:
 *                       type: string
 *                       nullable: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     image:
 *                       type: string
 *                       nullable: true
 *                     isSystemAdmin:
 *                       type: boolean
 *                 memberships:
 *                   type: array
 *                   description: User's organization memberships (empty array if none)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       roles:
 *                         type: array
 *                         description: Roles the user holds in this organization
 *                         items:
 *                           type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       organization:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           logo:
 *                             type: string
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Revocation check (authoritative). getSession honours its own cookie cache and
        // never inspects our custom `revokedAt` column, so a revoked session would stay
        // valid until natural expiry. Read the source-of-truth flag directly.
        const revocation = await prisma.session.findUnique({
            where: { id: session.session.id },
            select: { revokedAt: true },
        });
        if (revocation?.revokedAt) {
            return NextResponse.json({ error: "session_revoked" }, { status: 401 });
        }

        // Fetch user's organization memberships
        const memberRows = await prisma.member.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                role: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // `role` is internal only (better-auth stores roles comma-joined). Expose the
        // parsed `roles` array + the `organization` object; drop the redundant singular
        // `role` and `organizationId` (org.id covers it).
        const memberships = memberRows.map(({ role, ...m }) => ({
            ...m,
            roles: (role ?? '').split(',').map((r) => r.trim()).filter(Boolean),
        }));

        // La sucursal con la que se resuelve: la activa si la hay y, si no, la única
        // que tenga. Quien no ha elegido sucursal —que es todo el mundo hasta que
        // entra por primera vez— resolvía contra `null` y se quedaba sin permisos
        // aunque perteneciera a una. Con varias no se elige por él: eso lo decide la
        // persona al entrar.
        const orgActiva = session.session.activeOrganizationId
            ?? (memberships.length === 1 ? memberships[0].organization.id : null);

        const rbac = await resolveRbac(session.user.id, orgActiva);

        // Los NOMBRES de los roles, y los permisos con el nombre que buscan las
        // aplicaciones que consumen esto.
        //
        // `memberships[].roles` no vale para saber el rol: ahí va la columna `role`
        // de better-auth, que guarda "owner"/"member" —su propio vocabulario, no el
        // catálogo de Procovar—. Quien leyera eso buscando "SUPERVISOR" no lo
        // encontraba nunca y se quedaba sin rol, o sea sin entrar.
        //
        // El rol de verdad es el de la persona: el mismo en todas sus sucursales. Se
        // manda aparte y también dentro de `rbac`, junto a `permissions`, que es como
        // se llama `global` para quien lo recibe.
        const persona = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                defaultRole: { select: { name: true } },
                members: {
                    select: { memberRoles: { select: { role: { select: { name: true } } } } },
                },
            },
        });
        const roles = [
            ...(persona?.defaultRole?.name ? [persona.defaultRole.name] : []),
            ...(persona?.members ?? []).flatMap((m) => m.memberRoles.map((mr) => mr.role.name)),
        ];

        return NextResponse.json({
            ...session,
            memberships, // Empty array if user has no memberships
            role: persona?.defaultRole?.name ?? null,
            rbac: {
                ...rbac,
                roles: [...new Set(roles)],
                permissions: rbac.global,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
