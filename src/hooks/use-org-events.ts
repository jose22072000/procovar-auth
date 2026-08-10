'use client'

import { useEffect, useRef } from 'react'

export interface OrgEvent {
	type: 'reservation' | 'payout'
	orgId: string
	id?: string
	status?: string
	at: number
}

/**
 * Subscribe to the organization's real-time event stream (SSE via /api/events).
 * `onEvent` fires for every reservation/payout change in that org. The browser's
 * EventSource auto-reconnects on transient drops.
 */
export function useOrgEvents(orgId: string | null | undefined, onEvent: (event: OrgEvent) => void) {
	const cb = useRef(onEvent)
	cb.current = onEvent

	useEffect(() => {
		if (!orgId) return
		const es = new EventSource(`/api/events?orgId=${encodeURIComponent(orgId)}`)
		es.onmessage = (ev) => {
			try {
				cb.current(JSON.parse(ev.data) as OrgEvent)
			} catch {
				/* ignore non-JSON keep-alives */
			}
		}
		return () => es.close()
	}, [orgId])
}
