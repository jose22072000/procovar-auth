import { EncryptJWT, jwtDecrypt } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SECRET_KEY = process.env.AUTH_FLOW_SECRET || '';

if (!SECRET_KEY || SECRET_KEY.length !== 64) {
  console.warn('AUTH_FLOW_SECRET must be a 64-character hex string (32 bytes).');
}

// Convert hex secret to Uint8Array for jose
const key = Uint8Array.from(Buffer.from(SECRET_KEY, 'hex'));

export interface FlowOptions {
  clientId?: string;
  redirectUri?: string;
  action?: 'login' | 'signup' | 'verify';
  orgSlug?: string;
  invitationToken?: string;
  [key: string]: unknown;
}

export async function encodeFlowOptions(options: FlowOptions): Promise<string> {
  return new EncryptJWT(options as any)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('1h') // Optional: expire the link in 1 hour
    .encrypt(key);
}

export async function decodeFlowOptions(token: string): Promise<FlowOptions | null> {
  try {
    const { payload } = await jwtDecrypt(token, key);
    return payload as unknown as FlowOptions;
  } catch (error) {
    console.error('Failed to decode flow options:', error);
    return null;
  }
}

export async function handleFlowState(op: string) {
  const options = await decodeFlowOptions(op);
  if (options) {
    const cookieStore = await cookies();
    cookieStore.set('qb.flow_state', JSON.stringify(options), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
    });
    // Redirect to clean URL
    redirect('/');
  }
}
