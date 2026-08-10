import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const SESSION_RESOLVE_TIMEOUT_MS = 5000;

const getBearerToken = (request: Request) => {
    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
};

const getEnvBearerToken = () => (process.env.BEARER_TOKEN) || '';

/**
 * Resolves the user ID from:
 * 1. Service-to-service: Bearer token matches BEARER_TOKEN env var → reads userId from query/body
 * 2. Cookie-based session: Uses better-auth session
 * Returns { userId, isService } or null if unauthorized.
 */
async function resolveUserId(
    request: NextRequest,
    bodyUserId?: string,
): Promise<{ userId: string; isService: boolean } | null> {
    const token = getBearerToken(request);
    const expectedToken = getEnvBearerToken();

    // Service-to-service auth via BEARER_TOKEN
    if (token && expectedToken && token === expectedToken) {
        const userId = request.nextUrl.searchParams.get('userId') || bodyUserId;
        if (userId) return { userId, isService: true };
    }

    // Cookie-based session auth with fail-fast timeout to avoid request pileups.
    try {
        const session = await Promise.race([
            auth.api.getSession({ headers: await headers() }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_RESOLVE_TIMEOUT_MS)),
        ]);

        if (session) return { userId: session.user.id, isService: false };
    } catch {
        return null;
    }

    return null;
}

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get current user's subscriptions
 *     description: Returns all subscriptions for the authenticated user, including plan details.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: User subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 *   post:
 *     summary: Subscribe to a plan
 *     description: Creates a new subscription for the authenticated user.
 *     tags:
 *       - Subscriptions
 *     security:
 *       - CookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, YEARLY]
 *                 default: MONTHLY
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         description: Bad request (already subscribed or invalid plan)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function GET(request: NextRequest) {
    try {
        const resolved = await resolveUserId(request);
        if (!resolved) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscriptions = await prisma.subscription.findMany({
            where: { userId: resolved.userId },
            include: {
                plan: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                        description: true,
                        priceMonthly: true,
                        priceYearly: true,
                        features: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ subscriptions });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { planId, billingCycle = 'MONTHLY', userId: bodyUserId } = body;

        const resolved = await resolveUserId(request, bodyUserId);
        if (!resolved) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = resolved.userId;

        if (!planId) {
            return NextResponse.json({ error: 'planId is required' }, { status: 400 });
        }

        if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
            return NextResponse.json({ error: 'billingCycle must be MONTHLY or YEARLY' }, { status: 400 });
        }

        // Verify plan exists and is active
        const plan = await prisma.plan.findUnique({
            where: { id: planId, isActive: true },
        });

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found or inactive' }, { status: 400 });
        }

        // Check if user already has an active subscription
        const existingActive = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
        });

        if (existingActive) {
            // Cancel the old subscription so the user can switch plans
            await prisma.subscription.update({
                where: { id: existingActive.id },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });
        }

        // Calculate period end
        const now = new Date();
        const periodEnd = new Date(now);
        if (billingCycle === 'YEARLY') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const subscription = await prisma.subscription.create({
            data: {
                userId,
                planId: plan.id,
                billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                        description: true,
                        features: true,
                    },
                },
            },
        });

        return NextResponse.json({ subscription }, { status: 201 });
    } catch (error) {
        console.error('Error creating subscription:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
