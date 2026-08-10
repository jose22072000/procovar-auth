"use server";

import { cookies } from 'next/headers';
import type { FlowOptions } from './flow-state';

/**
 * Get the redirect URL and clear the flow state cookie in one operation
 * Use this when redirecting after authentication
 */
export async function consumeFlowRedirect(defaultUrl: string = '/profile'): Promise<string> {
  const cookieStore = await cookies();
  const flowStateCookie = cookieStore.get('qb.flow_state');
  
  let redirectUrl = defaultUrl;
  
  if (flowStateCookie?.value) {
    try {
      const flowState: FlowOptions = JSON.parse(flowStateCookie.value);
      if (flowState.origin) {
        redirectUrl = flowState.origin;
      }
    } catch {
      // Invalid JSON, use default
    }
  }
  
  // Clear the cookie
  cookieStore.delete('qb.flow_state');
  
  return redirectUrl;
}
