/**
 * Single source of truth for the qb-auth scope catalog.
 *
 * Every scope used by the Identity Hub MUST be listed here, with metadata
 * describing what it does, which microservice typically needs it, and what
 * risk level it carries. The admin UI reads this catalog to power the
 * /apikeys page (search, presets, descriptions).
 *
 * To add a new scope:
 *   1. Add the entry below.
 *   2. Reference it from the route handler that requires it
 *      (via withServiceAuth({ scopes: [...] })).
 *   3. Optionally add it to PRESETS or ROLE_RECOMMENDED_SCOPES.
 */

export type ScopeRisk = 'read' | 'write' | 'admin';

export interface ScopeDefinition {
    /** Canonical scope id, format `<resource>:<action>`. */
    id: string;
    /** Logical group used to render the catalog. */
    category:
        | 'session'
        | 'auth-flow'
        | 'jwt'
        | 'apikey'
        | 'admin'
        | 'notify'
        | 'wildcard';
    /** Human-readable short name. */
    label: string;
    /** What this scope authorizes. */
    description: string;
    /** Risk classification — drives UI color & warnings. */
    risk: ScopeRisk;
    /** Endpoints protected by this scope (informational). */
    endpoints: string[];
    /**
     * Microservices that typically need this scope.
     * Used to suggest the right scopes when onboarding a new client.
     */
    suggestedFor?: string[];
}

/* eslint-disable max-len */
export const SCOPES: ScopeDefinition[] = [
    // ── Sessions ──────────────────────────────────────────────────────────
    {
        id: 'session:verify',
        category: 'session',
        label: 'Verify session',
        description:
            'Validate a `qb.session_token` cookie / sessionToken and receive the user, session and memberships.',
        risk: 'read',
        endpoints: ['POST /api/auth/verify-session'],
        suggestedFor: ['qb-back', 'qb-panel', 'qb-booking', 'qb-notify'],
    },
    {
        id: 'session:revoke',
        category: 'session',
        label: 'Revoke session',
        description:
            'Sign the user out of one or all of their sessions. Used by logout flows and admin tooling.',
        risk: 'write',
        endpoints: ['POST /api/auth/revoke-session'],
        suggestedFor: ['qb-back', 'qb-panel'],
    },

    // ── Authentication flow ───────────────────────────────────────────────
    {
        id: 'callback:create',
        category: 'auth-flow',
        label: 'Mint callback token',
        description:
            'Create a single-use callback JWT that the user is redirected through to start the login flow on this client.',
        risk: 'write',
        endpoints: ['POST /api/auth/callback-token'],
        suggestedFor: ['qb-booking', 'qb-panel'],
    },
    {
        id: 'callback:any',
        category: 'auth-flow',
        label: 'Mint callback token for any client',
        description:
            'Allow overriding the `clientId` when minting a callback token. Reserved for tools that proxy login on behalf of multiple clients.',
        risk: 'admin',
        endpoints: ['POST /api/auth/callback-token (with clientId override)'],
        suggestedFor: ['qb-admin'],
    },
    {
        id: 'auth:exchange',
        category: 'auth-flow',
        label: 'Exchange auth code',
        description:
            'Trade the opaque `code` returned by /api/auth/callback for a usable session payload (sessionToken, user, memberships).',
        risk: 'read',
        endpoints: ['POST /api/auth/exchange'],
        suggestedFor: ['qb-booking', 'qb-panel'],
    },

    // ── Inter-service JWT (RS256 + JWKS) ──────────────────────────────────
    {
        id: 'jwt:sign',
        category: 'jwt',
        label: 'Sign service JWT',
        description:
            'Mint an RS256 JWT signed by qb-auth. Receivers can verify it locally via /.well-known/jwks.json without calling the hub.',
        risk: 'write',
        endpoints: ['POST /api/auth/sign'],
        suggestedFor: ['qb-back', 'qb-panel', 'qb-notify'],
    },
    {
        id: 'jwt:verify',
        category: 'jwt',
        label: 'Verify service JWT',
        description:
            'Verify an RS256 JWT centrally via the hub. Prefer local JWKS verification with `createJwksVerifier()` for zero round-trip.',
        risk: 'read',
        endpoints: ['POST /api/auth/verify'],
        suggestedFor: ['qb-back', 'qb-notify'],
    },

    // ── API keys ──────────────────────────────────────────────────────────
    {
        id: 'apikey:verify',
        category: 'apikey',
        label: 'Verify API key',
        description:
            'Validate an API key (format `qbk_<env>_<prefix>_<secret>`) presented by an external client and return its scopes.',
        risk: 'read',
        endpoints: ['POST /api/auth/api-keys/verify'],
        suggestedFor: ['qb-back', 'qb-notify'],
    },

    // ── Notifications (qb-notify integration) ─────────────────────────────
    {
        id: 'notify:send',
        category: 'notify',
        label: 'Send notification',
        description:
            'Trigger transactional notifications (email / SMS / push) through qb-notify on behalf of this client.',
        risk: 'write',
        endpoints: ['POST {NOTIFY_URL}/notifications/send'],
        suggestedFor: ['qb-back', 'qb-panel', 'qb-booking'],
    },
    {
        id: 'notify:templates:read',
        category: 'notify',
        label: 'Read notification templates',
        description:
            'List and inspect notification templates managed by qb-notify (read-only).',
        risk: 'read',
        endpoints: ['GET {NOTIFY_URL}/templates'],
        suggestedFor: ['qb-panel'],
    },
    {
        id: 'notify:templates:manage',
        category: 'notify',
        label: 'Manage notification templates',
        description:
            'Create, update or delete notification templates in qb-notify. Admin-only.',
        risk: 'admin',
        endpoints: ['POST/PUT/DELETE {NOTIFY_URL}/templates'],
        suggestedFor: ['qb-panel', 'qb-admin'],
    },

    // ── Wildcard ──────────────────────────────────────────────────────────
    {
        id: '*',
        category: 'wildcard',
        label: 'Full access on qb-auth (super-client)',
        description:
            'Grants every current and future scope WHEN CALLING qb-auth endpoints. Does NOT bypass auth on other microservices (qb-back, qb-notify…) — they enforce their own. Use only for an internal admin client (e.g. `qb-admin`) and store its signing key in a secrets manager.',
        risk: 'admin',
        endpoints: ['ALL endpoints exposed by qb-auth'],
        suggestedFor: ['qb-admin'],
    },
];

export const SCOPE_BY_ID: Record<string, ScopeDefinition> = Object.fromEntries(
    SCOPES.map(s => [s.id, s]),
);

export function isKnownScope(id: string): boolean {
    return id in SCOPE_BY_ID;
}

/* ── Presets ──────────────────────────────────────────────────────────────
 * Curated scope bundles used to onboard new clients with one click.
 * Keep the list short and opinionated — the UI also allows custom selection.
 */

export interface ScopePreset {
    id: string;
    label: string;
    description: string;
    targetService: string;
    scopes: string[];
}

export const PRESETS: ScopePreset[] = [
    {
        id: 'consumer-backend',
        label: 'Consumer backend (qb-back style)',
        description:
            'Backend microservice that needs to verify sessions, sign/verify JWTs and validate API keys. No callback minting.',
        targetService: 'qb-back, qb-notify',
        scopes: [
            'session:verify',
            'session:revoke',
            'jwt:sign',
            'jwt:verify',
            'apikey:verify',
        ],
    },
    {
        id: 'frontend-bff',
        label: 'Frontend BFF (qb-panel style)',
        description:
            'Backend-for-frontend that drives a browser app: login flow, session checks, plus JWT signing for downstream services.',
        targetService: 'qb-panel',
        scopes: [
            'callback:create',
            'auth:exchange',
            'session:verify',
            'session:revoke',
            'jwt:sign',
            'jwt:verify',
            'apikey:verify',
        ],
    },
    {
        id: 'public-booking',
        label: 'Public booking flow (qb-booking style)',
        description:
            'Public-facing app that only needs to start the login flow and verify the resulting session.',
        targetService: 'qb-booking',
        scopes: ['callback:create', 'auth:exchange', 'session:verify'],
    },
    {
        id: 'notification-publisher',
        label: 'Notification publisher',
        description:
            'Service that emits notifications via qb-notify and verifies that the caller is logged in.',
        targetService: 'qb-notify (consumer)',
        scopes: ['session:verify', 'notify:send', 'jwt:verify'],
    },
    {
        id: 'admin-super-client',
        label: 'Admin super-client (qb-admin)',
        description:
            'Programmatic access to every endpoint. Use sparingly and store the key in a secrets manager.',
        targetService: 'qb-admin',
        scopes: ['*'],
    },
];

export const PRESET_BY_ID: Record<string, ScopePreset> = Object.fromEntries(
    PRESETS.map(p => [p.id, p]),
);

/* ── Role → recommended scopes ────────────────────────────────────────────
 * Maps your business-level roles to a baseline scope set. Today only the
 * `system-admin` role exists in qb-auth; this map is here so when you add
 * more roles (e.g. `partner`, `support`) the UI already knows what to suggest.
 */
export const ROLE_RECOMMENDED_SCOPES: Record<string, string[]> = {
    'system-admin': ['*'],
    'partner-backend': [
        'session:verify',
        'jwt:verify',
        'apikey:verify',
        'notify:send',
    ],
    'support-readonly': ['session:verify', 'jwt:verify', 'apikey:verify'],
};

/* ── Microservices catalog ────────────────────────────────────────────────
 * Listed for the help section of the /apikeys page. */
export interface MicroserviceInfo {
    id: string;
    name: string;
    role: string;
    baseUrl?: string;
}
export const MICROSERVICES: MicroserviceInfo[] = [
    {
        id: 'qb-auth',
        name: 'QB Auth (Identity Hub)',
        role: 'Owns users, sessions, signing keys, API keys, JWKS.',
        baseUrl: 'https://qb-accounts.hostravel.com',
    },
    {
        id: 'qb-back',
        name: 'QB Back (Core API)',
        role: 'Domain backend. Verifies sessions, issues service JWTs.',
        baseUrl: 'https://qb-back.hostravel.com',
    },
    {
        id: 'qb-notify',
        name: 'QB Notify',
        role: 'Sends transactional emails / SMS / push. Consumes qb-auth for caller validation.',
        baseUrl: 'https://qb-notify.hostravel.com',
    },
    {
        id: 'qb-panel',
        name: 'QB Panel (Admin UI)',
        role: 'Internal operations dashboard. BFF for admin tooling.',
        baseUrl: 'https://qb-panel.hostravel.com',
    },
    {
        id: 'qb-booking',
        name: 'QB Booking',
        role: 'Public booking funnel.',
        baseUrl: 'https://qb-booking.hostravel.com',
    },
];
