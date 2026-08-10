'use client'

import { useRouter } from 'next/navigation'
import { useOrgEvents } from '@/hooks/use-org-events'

/**
 * Drop-in client component: refreshes the current route (re-running the server
 * components — payouts, reservations, balances) whenever a real-time reservation
 * or payout event arrives for the organization. Renders nothing.
 */
export function OrgEventsRefresher({ orgId }: { orgId: string }) {
	const router = useRouter()
	useOrgEvents(orgId, () => router.refresh())
	return null
}
