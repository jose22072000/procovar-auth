import { NextResponse } from 'next/server'
import { requireSystemAdmin } from '@/lib/require-admin'
import { syncRbac } from '@/rbac/sync'

/** Admin-only: re-sync the code-defined RBAC catalog into the DB on demand. */
export async function POST() {
  const guard = await requireSystemAdmin()
  if (guard instanceof NextResponse) return guard
  try {
    const result = await syncRbac()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 },
    )
  }
}
