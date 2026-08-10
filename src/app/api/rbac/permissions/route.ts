import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const permissions = await prisma.permission.findMany({
    where: { isDeprecated: false },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  })
  return NextResponse.json({ permissions })
}
