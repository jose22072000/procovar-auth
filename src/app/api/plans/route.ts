import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List available plans
 *     description: Returns all active subscription plans with their features and pricing.
 *     tags:
 *       - Plans
 *     responses:
 *       200:
 *         description: List of plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       key:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       priceMonthly:
 *                         type: number
 *                       priceYearly:
 *                         type: number
 *                       features:
 *                         type: object
 *                       sortOrder:
 *                         type: integer
 *       500:
 *         description: Internal Server Error
 */
export async function GET() {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                key: true,
                name: true,
                description: true,
                priceMonthly: true,
                priceYearly: true,
                features: true,
                sortOrder: true,
                icon: true,
                color: true,
                popular: true,
            },
        });

        return NextResponse.json({ plans });
    } catch (error) {
        console.error('Error fetching plans:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
