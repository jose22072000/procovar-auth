import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireSystemAdmin } from '@/lib/require-admin'

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = (process.env.BEARER_TOKEN) || ''
  if (!token || !expected) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** GET all plans (incl. inactive) for the admin panel. */
export async function GET(request: Request) {
  if (!isServiceAuth(request)) {
    const guard = await requireSystemAdmin()
    if (guard instanceof NextResponse) return guard
  }
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ plans })
}

/** POST create a plan. */
export async function POST(req: Request) {
  if (!isServiceAuth(req)) {
    const guard = await requireSystemAdmin()
    if (guard instanceof NextResponse) return guard
  }
  const body = await req.json().catch(() => null)
  if (!body?.key || !body?.name) {
    return NextResponse.json({ error: 'key and name are required' }, { status: 400 })
  }
  try {
    const plan = await prisma.plan.create({
      data: {
        key: String(body.key),
        name: String(body.name),
        description: body.description ?? null,
        priceMonthly: body.priceMonthly ?? 0,
        priceYearly: body.priceYearly ?? 0,
        features: body.features ?? {},
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
        icon: body.icon ?? null,
        color: body.color ?? null,
        popular: body.popular ?? false,
      },
    })
    return NextResponse.json({ plan }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Could not create plan (duplicate key?)' }, { status: 409 })
  }
}
