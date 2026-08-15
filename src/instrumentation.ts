/**
 * Runs once per server instance at startup (Next.js instrumentation).
 * Auto-syncs the RBAC catalog (permissions + system roles) and the registered
 * client applications into the DB so a fresh deploy always has them — no manual
 * CLI step. Idempotent and best-effort: a failure (e.g. DB briefly unreachable)
 * never blocks boot.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { syncRbac } = await import('@/rbac/sync')
    const res = await syncRbac()
    console.log('[rbac] auto-sync on boot:', res)
  } catch (e) {
    console.error('[rbac] auto-sync failed (non-fatal):', e)
  }
  try {
    const { syncClients } = await import('@/lib/sync-clients')
    const res = await syncClients()
    console.log('[clients] auto-sync on boot:', res)
  } catch (e) {
    console.error('[clients] auto-sync failed (non-fatal):', e)
  }
}
