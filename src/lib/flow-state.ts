import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = (process.env.BEARER_TOKEN) || '';

if (!SECRET_KEY || SECRET_KEY.length < 32) {
  console.warn('BEARER_TOKEN is required for flow state encryption.');
}

// Use TextEncoder to match the other server
const key = new TextEncoder().encode(SECRET_KEY);

export interface FlowOptions {
  origin?: string;
  clientId?: string;
  redirectUri?: string;
  action?: 'login' | 'signup' | 'verify';
  prompt?: 'none';
  orgSlug?: string;
  invitationToken?: string;
  redirectOrigin?: boolean;
  [key: string]: unknown;
}

export async function encodeFlowOptions(options: FlowOptions): Promise<string> {
  return new SignJWT(options as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

export async function decodeFlowOptions(token: string): Promise<FlowOptions | null> {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    // URL decode the token in case it came from a URL parameter
    const decodedToken = decodeURIComponent(cleanToken);
    
    const { payload } = await jwtVerify(decodedToken, key);
    return payload as unknown as FlowOptions;
  } catch (error) {
    console.error('Failed to decode flow options:', error);
    return null;
  }
}

/**
 * Get the flow state from cookie
 */
export async function getFlowState(): Promise<FlowOptions | null> {
  try {
    const cookieStore = await cookies();
    const flowStateCookie = cookieStore.get('qb.flow_state');
    if (!flowStateCookie?.value) return null;
    return JSON.parse(flowStateCookie.value) as FlowOptions;
  } catch {
    return null;
  }
}

/**
 * Clear the flow state cookie
 */
export async function clearFlowState(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('qb.flow_state');
}

/**
 * Get the redirect URL from flow state, or default to /profile
 */
export async function getFlowRedirectUrl(defaultUrl: string = '/profile'): Promise<string> {
  const flowState = await getFlowState();
  return flowState?.origin || defaultUrl;
}

/**
 * Create a short-lived exchange code that contains the session token.
 * The external app uses this code to call /api/auth/exchange and get user/session data.
 * Expires in 60 seconds - single use.
 */
export async function createExchangeCode(sessionToken: string): Promise<string> {
  return new SignJWT({ sessionToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(key);
}

/**
 * Validate an exchange code and return the session token inside it.
 */
export async function validateExchangeCode(code: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(code, key);
    return (payload as any).sessionToken || null;
  } catch {
    return null;
  }
}

/**
 * Get the session cookie name based on environment
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-qb.session_token'
    : 'qb.session_token';
}

/**
 * Build a redirect URL with exchange code appended as ?code= parameter.
 * Only for external origins (redirectOrigin flow).
 */
export async function buildExternalRedirectUrl(origin: string, sessionToken: string): Promise<string> {
  const code = await createExchangeCode(sessionToken);
  const url = new URL(origin);
  url.searchParams.set('code', code);
  return url.toString();
}
