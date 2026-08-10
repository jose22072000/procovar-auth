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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isServiceAuth(req)) {
    const guard = await requireSystemAdmin()
    if (guard instanceof NextResponse) return guard
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  for (const k of ['name', 'description', 'priceMonthly', 'priceYearly', 'features', 'sortOrder', 'isActive', 'icon', 'color', 'popular'] as const) {
    if (k in body) data[k] = body[k]
  }
  try {
    const plan = await prisma.plan.update({ where: { id }, data })
    return NextResponse.json({ plan })
  } catch {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isServiceAuth(req)) {
    const guard = await requireSystemAdmin()
    if (guard instanceof NextResponse) return guard
  }
  const { id } = await params
  try {
    await prisma.plan.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Plan not found or in use' }, { status: 409 })
  }
}
